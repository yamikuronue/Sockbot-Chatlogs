'use strict';
/*globals describe, it*/

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.should();

const sinon = require('sinon');
require('sinon-as-promised');

const sockChatLogs = require('../src/index');

const testConfig = {
	db: ':memory:',
	thread: 11,
	name: 'testMafia'
};

const mockForum = {
	username: 'yamibot',
	owner: {
		username: 'yamikuronue'
	},
	Post: {
		reply: sinon.stub().resolves()
	},
	supports: (input) => {
		return input === 'Chats' || input === 'Formatting.Markup.HTML' || input === 'Formatting.Multiline';
	},
	emit: () => Promise.resolve()
};

describe('Sockbot-Chatlogs', function() {
    const chatLogInstance = sockChatLogs.plugin(mockForum, testConfig);
    describe('logStart', () => {
        const fakeCommand = {
            getTopic: () => Promise.resolve({
				id: 'someRoom'
			}),
			reply: () => Promise.resolve(),
			ids: {
			    channel: 'someRoom',
			    user: 'yamikuronue'
			}
        };
        
        before(() => {
           chatLogInstance.forum = mockForum; 
        });
        
        afterEach(() => {
            delete chatLogInstance.logsInProgress['someRoom'];
        });
        
        it('should exist', () => {
            chatLogInstance.onLogStart.should.be.a('function');
        });
        
        it('should return a promise', () => {
            chatLogInstance.onLogStart(fakeCommand).should.be.fulfilled;
        });
        
        it('should log the channel', () => {
            return chatLogInstance.onLogStart(fakeCommand).then(() => {
               Object.keys(chatLogInstance.logsInProgress).should.include('someRoom');
            });
        });
        
        it('should emit a start action', () => {
            sinon.spy(mockForum, 'emit');
            return chatLogInstance.onLogStart(fakeCommand).then(() => {
                mockForum.emit.should.have.been.calledWith('logStart', {
                    source: 'someRoom',
                    requestor: 'yamikuronue'
                });
                mockForum.emit.restore();
            });
        });
        
        it('should not log a channel already being logged', () => {
            chatLogInstance.logsInProgress.someRoom = true;
            sinon.spy(fakeCommand, 'reply');
            return chatLogInstance.onLogStart(fakeCommand).then(() => {
               Object.keys(chatLogInstance.logsInProgress).should.include('someRoom');
               fakeCommand.reply.should.have.been.calledWith('Error: Log already in progess');
               fakeCommand.reply.restore();
            });
        });
    });
    
    describe('logEnd', () => {
        const fakeCommand = {
            getTopic: () => Promise.resolve({
				id: 'someRoom'
			}),
			reply: () => Promise.resolve(),
			ids: {
			    channel: 'someRoom',
			    user: 'accalia'
			}
        };
        
        before(() => {
           chatLogInstance.forum = mockForum; 
        });
        
        beforeEach(() => {
            chatLogInstance.logsInProgress.someRoom = true;
        });
        
        it('should exist', () => {
            chatLogInstance.onLogEnd.should.be.a('function');
        });
        
        it('should return a promise', () => {
            chatLogInstance.onLogEnd(fakeCommand).should.be.fulfilled;
        });
        
        it('should stop logging the channel', () => {
            return chatLogInstance.onLogEnd(fakeCommand).then(() => {
               Object.keys(chatLogInstance.logsInProgress).should.not.include('someRoom');
            });
        });
        
        it('should emit a end action', () => {
            sinon.spy(mockForum, 'emit');
            return chatLogInstance.onLogEnd(fakeCommand).then(() => {
                mockForum.emit.should.have.been.calledWith('logEnd', {
                    source: 'someRoom',
                    requestor: 'accalia'
                });
                mockForum.emit.restore();
            });
        });
        
        it('should error when there is no log in progress', () => {
            delete chatLogInstance.logsInProgress['someRoom'];
            sinon.spy(fakeCommand, 'reply');
            return chatLogInstance.onLogEnd(fakeCommand).then(() => {
               fakeCommand.reply.should.have.been.calledWith('Error: No logging in progess to end');
               fakeCommand.reply.restore();
            });
        });
    });
});