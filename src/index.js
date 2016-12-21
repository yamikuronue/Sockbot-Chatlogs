'use strict';
const fs = require('fs');

const storage = require('node-persist');
storage.initSync();

const debug = require('debug')('sockbot:sockChatLogs');


class ChatLogger {
    constructor(forum, config) {
        this.forum = forum;
        this.logsInProgress = {};
        this.logdir = config.logdir || `${__dirname}/../logs`;
        require('mkdirp').sync(this.logdir);
    }
    
    activate() {
        this.forum.Commands.add('logStart', 'Start a log file in the current channel', this.onLogStart, this);
        this.forum.Commands.add('logEnd', 'End a log file in the current channel', this.onLogEnd, this);
        this.forum.Commands.add('pause', 'Pause the log file in the current channel', this.onPause, this);
        this.forum.Commands.add('resume', 'Resume a log file in the current channel', this.onResume, this);
        this.forum.on('notification:notification', this.onMessage.bind(this));
        return Promise.resolve();
    }
    
    deactivate() {
        this.forum.off('notification:notification', this.onMessage);
        return Promise.resolve();
    }
    
    getNextLogNum(channel) {
        return storage.getItem(channel).then((value) => {
            const newValue = value ? value + 1 : 1;
            return storage.setItem(String(channel), String(newValue)).then(() => Promise.resolve(newValue));
        }).catch((err) => {
            debug(err);
            debug(err.stack);
        });
    }
    
    onLogStart(command) {
        return command.getTopic().then((topic) => {
            debug(topic);
            if (this.logsInProgress[topic.id]) {
                command.reply('Error: Log already in progess');
                return Promise.resolve();
            }
            
            return this.getNextLogNum(topic.id).then((num) => {
                const logID = getLogID(topic.id, num);
                this.logsInProgress[topic.id] = logID;
                this.forum.emit('logStart', {
                    source: topic.id,
                    requestor: command.parent.ids.user,
                    id: logID
                });
            });
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
                    requestor: command.parent.ids.user,
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
                    requestor: command.parent.ids.user,
                    id: logID
                });
            }
        });
    }
    
    onResume(command) {
        return command.getTopic().then((topic) => {
            const logID = getLogID(topic.id, command.args[0]);
            const filename = this.getFilename(logID);
            if (fs.existsSync(filename)) {
                this.logsInProgress[topic.id] = logID;
                command.reply('Resumed logging');
                 this.forum.emit('logResume', {
                    source: topic.id,
                    requestor: command.parent.ids.user,
                    id: logID
                });
                return Promise.resolve();
            }
            
            command.reply('Error: No such log to resume');
            return Promise.resolve();
        });
    }
    
    onMessage(notification) {
        debug('onMessage fired');
        if (this.logsInProgress[notification.topicId]) {
            return new Promise((resolve, reject) => {
                notification.getText().then((text) => {
                    const filename = this.getFilename(this.logsInProgress[notification.topicId]);
                    debug(`writing to file ${filename}`);
                    fs.appendFile(filename, `${text}\n`, (err) => {
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
    
    /**
    * Get the filename to log under
    * @param {String} logID The log identifier
    * @returns {String} The filename
    */
    getFilename(logID) {
        return `${this.logdir}/${logID}.txt`;
    }
}

/**
* Get the ID to log under
* @param {String} topicId The channel identifier
* @param {Number} logNum The current log number
* @returns {String} The log ID
*/
function getLogID (topicId, logNum) {

    //Strip channel ID leading # to make it easier to see
    topicId = topicId.replace('#', '');
    
    //Strip windows-unfriendly filesystem chars
    topicId = topicId.replace(/[/\\?%*:|"<>\.]/g, '_');
    return `${topicId}${logNum}`;
}



module.exports = {
    plugin: (forum, config) => {
        return new ChatLogger(forum, config);
    }
};
