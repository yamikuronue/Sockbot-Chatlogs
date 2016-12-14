'use strict';
const fs = require('fs');

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
        forum.Commands.add('logStart', 'Start a log file in the current channel', this.onLogStart);
        forum.Commands.add('logEnd', 'End a log file in the current channel', this.onLogEnd);
        forum.Commands.add('pause', 'Pause the log file in the current channel', this.onPause);
        forum.Commands.add('resume', 'Resume a log file in the current channel', this.onResume);
        forum.on('notification:message', this.onMessage);
        return Promise.resolve();
    }
    
    deactivate() {
        this.forum.off('notification:message', this.onMessage);
        return Promise.resolve();
    }
    
    getNextLogNum(channel) {
        return 1;
    }
    
    onLogStart(command) {
        return command.getTopic().then((topic) => {
            if (this.logsInProgress[topic.id]) {
                command.reply('Error: Log already in progess');
            } else {
                const logID = topic.id + this.getNextLogNum(topic.id);
                this.logsInProgress[topic.id] = `${logID}.txt`;
                this.forum.emit('logStart', {
                    source: topic.id,
                    requestor: command.ids.user,
                    id: logID
                });
            }
        });
    }
    
    onLogEnd(command) {
        return command.getTopic().then((topic) => {
            if (!this.logsInProgress[topic.id]) {
                command.reply('Error: No logging in progess to end');
            } else {
                const logID = this.logsInProgress[topic.id];
                delete this.logsInProgress[topic.id];
                this.forum.emit('logEnd', {
                    source: topic.id,
                    requestor: command.ids.user,
                    id: logID
                });
            }
        });
    }
    
    onPause(command) {
        return command.getTopic().then((topic) => {
            if (!this.logsInProgress[topic.id]) {
                command.reply('Error: No logging in progess to end');
            } else {
                const logID = this.logsInProgress[topic.id];
                delete this.logsInProgress[topic.id];
                this.forum.emit('logPause', {
                    source: topic.id,
                    requestor: command.ids.user,
                    id: logID
                });
            }
        });
    }
    
    onResume(command) {
        return Promise.resolve();
    }
    
    onMessage(notification) {
        if (this.logsInProgress[notification.topicId]) {
            return new Promise((resolve, reject) => {
                notification.getText().then((text) => {
                    fs.appendFile(this.logsInProgress[notification.topicId], text, (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    });
                });
            });
        }
        
        return Promise.resolve();
    }
}