module.exports = {
    plugin: () => {
        return {
            activate: function(forum) {
                forum.Commands.add('logStart', 'Start a log file in the current channel', () => Promise.resolve());
                forum.Commands.add('logEnd', 'End a log file in the current channel', () => Promise.resolve());
                forum.Commands.add('pause', 'Pause the log file in the current channel', () => Promise.resolve());
                forum.Commands.add('resume', 'Resume a log file in the current channel', () => Promise.resolve());
                return Promise.resolve();
            },
            deactivate: () => Promise.resolve()
        };
    }
}