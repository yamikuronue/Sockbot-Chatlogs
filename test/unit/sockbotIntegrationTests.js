'use strict';
/*globals describe, it*/

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.should();

const sinon = require('sinon');
require('sinon-as-promised');

const sockChatLogs = require('../../src/index');

const testConfig = {
};

describe('Sockbot-Chatlogs', function() {
	let sandbox;
	const Commands = {
		commandList: {},
		add: (name, help, handler) => {
			Commands.commandList[name] = handler;
			return Promise.resolve();
		},
		
		addAlias: (name, help, handler) => {
			Commands.commandList[name] = handler;
			return Promise.resolve();
		}
	};


	const mockForum = {
			username: 'yamibot',
			owner: {
				username: 'yamikuronue'
			},
			Commands: Commands,
			Post: {
				reply: sinon.stub().resolves()
			},
			supports: (input) => {
				return input === 'Chats' || input === 'Formatting.Markup.HTML' || input === 'Formatting.Multiline';
			},
			on: () => true,
			off: () => true
		};

	let chatLogInstance;


	beforeEach(() => {
		chatLogInstance = sockChatLogs.plugin(mockForum, testConfig);
		sandbox = sinon.sandbox.create();
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('Should export a function', () => {
		sockChatLogs.plugin.should.be.a('function');
	});

	it('Should create a plugin when called', () => {
		chatLogInstance.activate.should.be.a('function');
		chatLogInstance.deactivate.should.be.a('function');
	});

	describe('command formats', () => {
		let knownCommands;
		before(() => {
			knownCommands = {
				'logStart': chatLogInstance.onLogStart,
				'logEnd': chatLogInstance.onLogEnd,
				'pause': chatLogInstance.onPause,
				'resume': chatLogInstance.onResume,
			};
		});

		it('Should register the correct commands', () => {
			return chatLogInstance.activate().then(() => {
				for (const command in knownCommands) {
					Object.keys(Commands.commandList).should.include(command);
					Commands.commandList[command].should.equal(knownCommands[command]);
				}
			});
		});
	});
	
	describe('Notifications', () => {
		it('Should listen for new messages', () => {
			sinon.spy(mockForum, 'on');
			return chatLogInstance.activate().then(() => {
				mockForum.on.should.have.been.calledWith('notification:notification');
				mockForum.on.reset();
			});
		});
		
		it('Should stop listening on command', () => {
			sinon.spy(mockForum, 'off');
			return chatLogInstance.deactivate().then(() => {
				mockForum.off.should.have.been.calledWith('notification:notification');
				mockForum.off.reset();
			});
		});
	});
});
