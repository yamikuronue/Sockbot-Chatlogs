'use strict';

module.exports = {
    plugin: () => {
        return new chatLogger();
    }
};

class chatLogger {
    constructor() {
        this.logsInProgress = {};
    }
    
    activate(forum) {
        this.forum = forum;
        forum.Commands.add('logStart', 'Start a log file in the current channel', () => Promise.resolve());
        forum.Commands.add('logEnd', 'End a log file in the current channel', () => Promise.resolve());
        forum.Commands.add('pause', 'Pause the log file in the current channel', () => Promise.resolve());
        forum.Commands.add('resume', 'Resume a log file in the current channel', () => Promise.resolve());
        return Promise.resolve();
    }
    
    deactivate() {
        return Promise.resolve();
    }
    
    onLogStart(command) {
        return command.getTopic().then((topic) => {
            if (this.logsInProgress[topic.id]) {
                command.reply('Error: Log already in progess');
            } else {
                this.logsInProgress[topic.id] = true;
                this.forum.emit('logStart', {
                    source: topic.id,
                    requestor: command.ids.user
                });
            }
        });
    }
    
    onLogEnd(command) {
        return command.getTopic().then((topic) => {
            if (!this.logsInProgress[topic.id]) {
                command.reply('Error: No logging in progess to end');
            } else {
                delete this.logsInProgress[topic.id];
                this.forum.emit('logEnd', {
                    source: topic.id,
                    requestor: command.ids.user
                });
            }
        });
    }
}