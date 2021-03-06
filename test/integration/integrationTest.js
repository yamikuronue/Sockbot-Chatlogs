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

const fs = require('fs');
const storage = require('node-persist');


const mockForum = {
	username: 'yamibot',
	owner: {
		username: 'yamikuronue'
	},
	Commands: {
        commandList: {},
        add: (name, help, handler) => {
            mockForum.Commands.commandList[name] = handler;
            return Promise.resolve();
        },
        addAlias: (name, help, handler) => {
            mockForum.Commands.commandList[name] = handler;
            return Promise.resolve();
        },
	},
    Post: {
        reply: sinon.stub().resolves()
	},
	supports: (input) => {
        return input === 'Chats' || input === 'Formatting.Markup.HTML' || input === 'Formatting.Multiline';
	},
	on: () => true,
	off: () => true,
	emit: sinon.stub().resolves()
};

const sockChatLogs = require('../../src/index');
const chatInstance = sockChatLogs.plugin(mockForum, {
    logdir: 'logs'
});

function notification(user, text) {
    return {
       topicId: '#crossings_ooc',
       getUser: () => Promise.resolve(user),
       getText: () => Promise.resolve(text),
       date: new Date(0)
    };
}


describe('Basic use case', () => {
    beforeEach(() => {
       sinon.stub(fs, 'existsSync').returns(false);
       sinon.stub(fs, 'appendFile').yields();
       sinon.stub(storage, 'getItem').resolves(23);
       sinon.stub(storage, 'setItem').resolves();
       
       chatInstance.activate(mockForum);
    });
    
    it('Should start out not logging', () => {
        return chatInstance.onMessage({
           topicId: '#crossings_ooc',
           getText: () => Promise.resolve('Hi, this is Yami')
        }).then(() => chatInstance.onMessage({
           topicId: '#crossings_ooc',
           getText: () => Promise.resolve('Can you hear me?')
        })).then(() => chatInstance.onMessage({
           topicId: '#crossings_ooc',
           getText: () => Promise.resolve('Yamibot? Hello?')
        })).then(() => {
           fs.appendFile.should.not.have.been.called;
        });
    });
    
    
    it('Should switch to logging', () => {
        const fakeUser = {
            username: 'accalia'
        };
        
        return chatInstance.onLogStart({
            parent: {
               ids: {
                   user: 'yamikuronue'
               }
            },
           getTopic: () => Promise.resolve({
               id: '#crossings_ooc',
               title: '#crossings_ooc'
           })
        })
        .then(() => chatInstance.onMessage(notification(fakeUser, 'Up on a housetop, reindeer pause')))
        .then(() => chatInstance.onMessage(notification(fakeUser, 'Here comes good old Santa Clause')))
        .then(() => chatInstance.onMessage(notification(fakeUser, 'Ho ho ho!')))
        .then(() => {
           fs.appendFile.should.have.been.calledWith('logs/crossings_ooc24.txt', '[00:00] <accalia> Up on a housetop, reindeer pause\n');
           fs.appendFile.should.have.been.calledWith('logs/crossings_ooc24.txt', '[00:00] <accalia> Here comes good old Santa Clause\n');
           fs.appendFile.should.have.been.calledWith('logs/crossings_ooc24.txt', '[00:00] <accalia> Ho ho ho!\n');
        });
    });
    
    it('Should switch to not logging', () => {
        return chatInstance.onLogEnd({
            parent: {
               ids: {
                   user: 'yamikuronue'
               }
            },
           getTopic: () => Promise.resolve({id: '#crossings_ooc'})
        }).then(() => chatInstance.onMessage({
           topicId: '#crossings_ooc',
           getText: () => Promise.resolve('Mamacita')
        })).then(() => chatInstance.onMessage({
           topicId: '#crossings_ooc',
           getText: () => Promise.resolve('Donde esta Santa Clause')
        })).then(() => chatInstance.onMessage({
           topicId: '#crossings_ooc',
           getText: () => Promise.resolve('And the toys that he will leave?')
        })).then(() => {
           fs.appendFile.should.not.have.been.called;
        });
    });
    
    afterEach(() => {
        fs.existsSync.restore();
        fs.appendFile.restore();
        storage.getItem.restore();
        storage.setItem.restore();
    });
});
