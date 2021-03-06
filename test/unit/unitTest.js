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

const sockChatLogs = require('../../src/index');
const fs = require('fs');
const storage = require('node-persist');

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
	
	describe('getNextLogNum', () => {
		before(() => {
			sinon.stub(storage, 'getItem').resolves(undefined);
			sinon.stub(storage, 'setItem').resolves();
		});
		
		it('should return a number', () => {
			chatLogInstance.getNextLogNum('channel').should.eventually.be.a('Number');
		});
		
		it('should return 1 the first time a channel is logged', () => {
			chatLogInstance.getNextLogNum('channel').should.eventually.equal(1);
		});
		
		it('should return 2 if log 1 has been made', () => {
			storage.getItem.resolves('1');
			chatLogInstance.getNextLogNum('channel').should.eventually.equal(2);
		});
		
		it('should return one higher than the previous log number', () => {
			storage.getItem.resolves('32');
			chatLogInstance.getNextLogNum('channel').should.eventually.equal(33);
		});
		
		it('should store the first log number', () => {
			storage.getItem.resolves(undefined);
			return chatLogInstance.getNextLogNum('channel').then(() => storage.setItem.should.have.been.calledWith('channel', '1'));
		});
		
		it('should store the next log number', () => {
			storage.getItem.resolves('1');
			storage.setItem.reset();
			return chatLogInstance.getNextLogNum('channel').then(() => storage.setItem.should.have.been.calledWith('channel', '2'));
		});
	});
	
	describe('logStart', () => {
		const fakeCommand = {
			getTopic: () => Promise.resolve({
				id: 'C23FGASDF',
				title: 'someRoom'
			}),
			reply: () => Promise.resolve(),
			parent: {
				ids: {
					channel: 'C23FGASDF',
					user: 'yamikuronue'
				}
			}
		};
		
		before(() => {
			sinon.spy(mockForum, 'emit');
			chatLogInstance.forum = mockForum;
			sinon.stub(chatLogInstance, 'getNextLogNum').resolves(1);
		});
		
		beforeEach(() => {
			chatLogInstance.logsInProgress = [];
		});
		
		after(() => {
			mockForum.emit.restore();
		});
		
		it('should exist', () => {
			chatLogInstance.onLogStart.should.be.a('function');
		});
		
		it('should return a promise', () => {
			chatLogInstance.onLogStart(fakeCommand).should.be.fulfilled;
		});
		
		it('should log the channel', () => {
			return chatLogInstance.onLogStart(fakeCommand).then(() => {
				Object.keys(chatLogInstance.logsInProgress).should.include('C23FGASDF');
				chatLogInstance.logsInProgress.C23FGASDF.should.equal('someRoom1');
			});
		});

		it('should emit a start action', () => {
			
			return chatLogInstance.onLogStart(fakeCommand).then(() => {
				mockForum.emit.should.have.been.calledWith('logStart', {
					source: 'C23FGASDF',
					requestor: 'yamikuronue',
					id: 'someRoom1'
				});
			});
		});
		
		it('should not log a channel already being logged', () => {
			chatLogInstance.logsInProgress.C23FGASDF = true;
			sinon.spy(fakeCommand, 'reply');
			return chatLogInstance.onLogStart(fakeCommand).then(() => {
				Object.keys(chatLogInstance.logsInProgress).should.include('C23FGASDF');
				fakeCommand.reply.should.have.been.calledWith('Error: Log already in progess');
				fakeCommand.reply.restore();
			});
		});
		
		describe('specialCharsInLogs', () => {
			it('should remove the leading # from the channel name when making an ID', () => {
				return chatLogInstance.onLogStart({
					getTopic: () => Promise.resolve({
						id: '#someRoom',
						title: '#someRoom'
					}),
					reply: () => Promise.resolve(),
					parent: {
						ids: {
							channel: '#someRoom',
							user: 'yamikuronue'
						}
					}
				}).then(() => {
					Object.keys(chatLogInstance.logsInProgress).should.include('#someRoom');
					chatLogInstance.logsInProgress['#someRoom'].should.equal('someRoom1');
				});
			});
			
			it('should replace windows-unfriendly chars with _', () => {
				return chatLogInstance.onLogStart({
					getTopic: () => Promise.resolve({
						id: '#$0m3r00/\\/\\_%0_:|',
						title: '#$0m3r00/\\/\\_%0_:|'
					}),
					reply: () => Promise.resolve(),
					parent: {
						ids: {
							channel: '#$0m3r00/\\/\\_%0_:|',
							user: 'yamikuronue'
						}
					}
				}).then(() => {
					Object.keys(chatLogInstance.logsInProgress).should.include('#$0m3r00/\\/\\_%0_:|');
					chatLogInstance.logsInProgress['#$0m3r00/\\/\\_%0_:|'].should.equal('$0m3r00______0___1');
				});
			});
		});
	});
	
	describe('logEnd', () => {
		const fakeCommand = {
			getTopic: () => Promise.resolve({
				id: 'someRoom'
			}),
			reply: () => Promise.resolve(),
			parent: {
				ids: {
					channel: 'someRoom',
					user: 'accalia'
				}
			}
		};
		
		before(() => {
			chatLogInstance.forum = mockForum;
		});
		
		beforeEach(() => {
			chatLogInstance.logsInProgress.someRoom = 'someRoom1';
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
					requestor: 'accalia',
					id: 'someRoom1'
				});
				mockForum.emit.restore();
			});
		});
		
		it('should error when there is no log in progress', () => {
			delete chatLogInstance.logsInProgress.someRoom;
			sinon.spy(fakeCommand, 'reply');
			return chatLogInstance.onLogEnd(fakeCommand).then(() => {
				fakeCommand.reply.should.have.been.calledWith('Error: No logging in progess to end');
				fakeCommand.reply.restore();
			});
		});
	});
	
	describe('onMessage', () => {
		const fakeNotification = {
			topicId: 'someChannel',
			getText: () => Promise.resolve('John Jacob Jingleheimer Shmidt'),
			getUser: () => Promise.resolve({
				username: 'yamikuronue'
			}),
			date: new Date(0)
		};
		
		before(() => {
			sinon.stub(fs, 'appendFile').yields();
			chatLogInstance.logdir = '../logs';
		});
		
		afterEach(() => {
			fs.appendFile.reset();
		});

		it('should exist', () => {
			chatLogInstance.onMessage.should.be.a('function');
		});
		
		it('should return a promise', () => {
			chatLogInstance.onMessage(fakeNotification).should.be.fulfilled;
		});
		
		it('should call appendFile when logger is on', () => {
			chatLogInstance.logsInProgress = {'someChannel': 'someChannel1'};
			return chatLogInstance.onMessage(fakeNotification).then(() => {
																						//time is unix epoch
				fs.appendFile.should.have.been.calledWith('../logs/someChannel1.txt', '[00:00] <yamikuronue> John Jacob Jingleheimer Shmidt\n');
			});
		});
		
		it('should not call appendFile when logger is off', () => {
			chatLogInstance.logsInProgress = [];
			return chatLogInstance.onMessage(fakeNotification).then(() => {
				fs.appendFile.should.not.have.been.called;
			});
		});
		
		it('should reject when errors occur', () => {
			chatLogInstance.logsInProgress = {'someChannel': 'someChannel1'};
			fs.appendFile.yields('An error occurred!');
			chatLogInstance.onMessage(fakeNotification).should.be.rejectedWith('An error occurred!');
		});
	});
	
	describe('pause', () => {
		const fakeCommand = {
			getTopic: () => Promise.resolve({
				id: 'someRoom'
			}),
			reply: () => Promise.resolve(),
			parent: {
				ids: {
					channel: 'someRoom',
					user: 'accalia'
				}
			}
		};
		
		before(() => {
			chatLogInstance.forum = mockForum;
		});
		
		beforeEach(() => {
			chatLogInstance.logsInProgress.someRoom = 'someRoom1';
		});
		
		it('should exist', () => {
			chatLogInstance.onPause.should.be.a('function');
		});
		
		it('should return a promise', () => {
			chatLogInstance.onPause(fakeCommand).should.be.fulfilled;
		});
		
		it('should stop logging the channel', () => {
			return chatLogInstance.onPause(fakeCommand).then(() => {
				Object.keys(chatLogInstance.logsInProgress).should.not.include('someRoom');
			});
		});
		
		it('should emit a end action', () => {
			sinon.spy(mockForum, 'emit');
			return chatLogInstance.onPause(fakeCommand).then(() => {
				mockForum.emit.should.have.been.calledWith('logPause', {
					source: 'someRoom',
					requestor: 'accalia',
					id: 'someRoom1'
				});
				mockForum.emit.restore();
			});
		});
		
		it('should error when there is no log in progress', () => {
			delete chatLogInstance.logsInProgress.someRoom;
			sinon.spy(fakeCommand, 'reply');
			return chatLogInstance.onPause(fakeCommand).then(() => {
				fakeCommand.reply.should.have.been.calledWith('Error: No logging in progess to end');
				fakeCommand.reply.restore();
			});
		});
	});
	
	describe('resume', () => {
		const fakeCommand = {
			getTopic: () => Promise.resolve({
				id: 'someRoom'
			}),
			reply: () => Promise.resolve(),
			parent: {
				ids: {
					topic: 'someRoom',
					user: 'kaelas'
				},
			},
			args: [123]
		};
		
		before(() => {
			sinon.stub(fs, 'existsSync');
			sinon.spy(mockForum, 'emit');
			chatLogInstance.forum = mockForum;
			chatLogInstance.logdir = '../logs';
		});
		
		it('should exist', () => {
			chatLogInstance.onResume.should.be.a('function');
		});
		
		it('should return a promise', () => {
			chatLogInstance.onResume(fakeCommand).should.be.fulfilled;
		});
		
		it('should send an error if there is no such file to resume', () => {
			fs.existsSync.returns(false);
			sinon.spy(fakeCommand, 'reply');

			return chatLogInstance.onResume(fakeCommand).then(() => {
				fs.existsSync.should.have.been.calledWith('../logs/someRoom123.txt');
				fakeCommand.reply.should.have.been.calledWith('Error: No such log to resume');
				fakeCommand.reply.restore();
			});
		});
		
		it('should start the log if there is such a file', () => {
			fs.existsSync.returns(true);
			sinon.spy(fakeCommand, 'reply');
			return chatLogInstance.onResume(fakeCommand).then(() => {
				fs.existsSync.should.have.been.calledWith('../logs/someRoom123.txt');
				fakeCommand.reply.should.have.been.calledWith('Resumed logging');
				fakeCommand.reply.restore();
			});
		});
		
		it('should mark the log as in progress', () => {
			fs.existsSync.returns(true);
			chatLogInstance.logsInProgress = [];
			return chatLogInstance.onResume(fakeCommand).then(() => {
				Object.keys(chatLogInstance.logsInProgress).should.include('someRoom');
			});
		});
		
		it('should emit a resume action', () => {
			mockForum.emit.reset();
			return chatLogInstance.onResume(fakeCommand).then(() => {
				mockForum.emit.should.have.been.calledWith('logResume', {
					source: 'someRoom',
					requestor: 'kaelas',
					id: 'someRoom123'
				});
			});
		});
	});
});
