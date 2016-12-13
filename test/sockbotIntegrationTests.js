'use strict';
/*globals describe, it*/

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
chai.should();

const sinon = require('sinon');
require('sinon-as-promised');

const sockChatLogs = require('../src/index');

const testConfig = {
	db: ':memory:',
	thread: 11,
	name: 'testMafia'
};

describe('Sockbot-Chatlogs', function() {
	this.timeout(50000);
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
			}
		};

	const chatLogInstance = sockChatLogs.plugin(mockForum, testConfig);


	beforeEach(() => {
		sandbox = sinon.sandbox.create();
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('Should export a function', () => {
		sockChatLogs.plugin.should.be.a('function');
	});

	it('Should create a plugin when called', () =>{
		chatLogInstance.activate.should.be.a('function');
		chatLogInstance.deactivate.should.be.a('function');
	});

	describe('command formats', () => {
		let knownCommands;
		before(() => {
			knownCommands = {
				'logStart': true,
				'logEnd': true,
				'pause': true,
				'resume': true,
			};
		});

		it('Should register the correct commands', () => {
			return chatLogInstance.activate(mockForum).then(() => {
				for (const command in knownCommands) {
					Object.keys(Commands.commandList).should.include(command);
				}
			});
		});
	});
});
