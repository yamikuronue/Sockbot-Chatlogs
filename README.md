# Sockbot-Chatlogs
Easy and simple chat logging for sockbot. This was intended to be used with chat-style providers such as Slack or IRC, but it can work with any provider.

## Installation
This is a plugin for [SockBot](https://github.com/SockDrawer/SockBot); please ensure you have that installed before beginning.

The preferred method of installation is via NPM; simply run this command within the SockBot installation folder: `npm install sockbot-chatlogs`

You can then enable the plugin in your config.yml:

```
---
core:
  username: [username goes here]
  password: [password goes here]
  server: [IRC server goes here]
  owner: [your nick here]
  provider: sockbot-irc
  channels:
    - #optional_list
    - #of_channels
    - #to_join
plugins:
  sockbot-chatlogs:
    logdir: [optional directory to store the logs in]
```

If you do not wish to specify a log directory, you can just set the `sockbot-chatlogs` key to `true` instead. The default log location is to create a `/logs` folder alongside `/src`. 

## Usage

- `!logstart` to begin a log
- `!logend` to end a log
- `!logpause` to pause the log
- `!logresume X` to resume log number X

Logs will be named sequentially on a per-channel basis. Every message received by the bot will be logged until logging is stopped. Each new log will open a new file with a new ID.

## Extensions

This plugin is designed to be extended with other plugins so that you can persist your logs in the way you desire. The plugin will emit the following events as appropriate
- `logger.start`: Signals the start of a new log.
- `logger.end`: Signals the end of an existing log.
- `logger.resume`: Signals the resumption of a paused log.
- `logger.pause`: Signals the pausing of a log
- `logger.error`: Signals an error that has occurred while logging

Each of these events will receive the following payload object

- `source`
    -   Type: TopicId
    -   Purpose: identifies the source of a log
- `id`
    -   Type: string
    -   Purpose: Uniquely identifies a log within a source
- `filePath`
    -   Type: string
    -   Purpose: absolute path to the log destination file
- `requester`
    -   Type: Username
    -   Purpose: Username of the person who initiated the action
