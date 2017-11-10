'use strict';

var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var path = require('path');
var poller = require('./poller.js');
var spawn = require('child_process').spawn;
var util = require('util');

module.exports = function (callback) {
  var who = util.format('%s|common|%s', global.who, 'executor');
  logger.info(who, 'Inside');

  var bag = {
    currentProcess: null,
    exitCode: 0,
    reqKickScriptNames: [],
    skipStatusUpdate: false,
    statusPoll: null,
    who: who
  };

  async.series(
    [
      _readScripts.bind(null, bag),
      _pollStatus.bind(null, bag),
      _executeSteps.bind(null, bag),
      _getStatus.bind(null, bag),
      _setStatus.bind(null, bag),
      _setExecutorAsReqProc.bind(null, bag)
    ],
    function () {
      if (bag.exitCode)
        logger.error(
          util.format('%s: Failed to process message with exit code: %s',
            who, bag.exitCode
          )
        );
      else
        logger.info(util.format('%s: Successfully processed message', who));

      callback();
    }
  );
};

function _readScripts(bag, next) {
  var who = bag.who + '|' + _readScripts.name;
  logger.verbose(who, 'Inside');

  fs.readFile(global.config.jobStepsPath, 'utf8',
    function (err, data) {
      if (err) {
        bag.exitCode = 1;
        logger.error(
          util.format('%s: Failed to read file: %s with error: %s',
            who, global.config.jobStepsPath, bag.exitCode
          )
        );
      } else {
        try {
          bag.reqKickScriptNames = JSON.parse(data).reqKick;
          logger.verbose(
            util.format('%s: Parsed file: %s successfully',
              who, global.config.jobStatusPath
            )
          );
        } catch (err) {
          bag.exitCode = 1;
          logger.error(
            util.format('%s: Failed to parse JSON file: %s with error: %s',
              who, global.config.jobStepsPath, err
            )
          );
        }
      }
      return next();
    }
  );
}

function _pollStatus(bag, next) {
  if (bag.exitCode) return next();

  var who = bag.who + '|' + _pollStatus.name;
  logger.verbose(who, 'Inside');

  var pollerOpts = {
    filePath: global.config.jobStatusPath,
    intervalMS: global.config.pollIntervalMS,
    content: 'cancelled'
  };

  poller(pollerOpts,
    function (err, statusPoll) {
      bag.statusPoll = statusPoll;
      if (err) {
        bag.exitCode = 1;
        logger.error(
          util.format('%s: Failed to status poller with error: %s', who, err)
        );
      } else {
        statusPoll.on('match', function () {
          logger.verbose(util.format('%s: Received cancelled status', who));
          if (bag.currentProcess) {
            try {
              bag.currentProcess.kill();
            } catch (err) {
              logger.warn(
                util.format('%s: Failed to kill process with pid: %s' +
                ' with error: %s', who, bag.currentProcess.pid, err)
              );
            }
          }
        });
      }
      return next();
    }
  );
}

function _executeSteps(bag, next) {
  if (bag.exitCode) return next();

  var who = bag.who + '|' + _executeSteps.name;
  logger.verbose(who, 'Inside');

  async.eachSeries(
    bag.reqKickScriptNames,
    function (scriptName, nextScriptName) {
      bag.currentProcess = spawn(global.config.reqExecBinPath, [
        path.join(global.config.scriptsDir, scriptName),
        global.config.jobENVPath
      ]);

      bag.currentProcess.on('exit',
        function (exitCode, signal) {
          bag.currentProcess = null;
          logger.verbose(util.format('%s: Script %s exited with exit code: ' +
            '%s and signal: %s', who, scriptName, exitCode, signal)
          );
          return nextScriptName(exitCode || signal);
        }
      );
    },
    function (err) {
      // The task has completed at this point, we don't want the status poller
      // to run anymore.
      bag.statusPoll.stop();
      if (err)
        bag.exitCode = 1;
      return next();
    }
  );
}

function _getStatus(bag, next) {
  var who = bag.who + '|' + _getStatus.name;
  logger.verbose(who, 'Inside');

  fs.readFile(global.config.jobStatusPath, 'utf8',
    function (err, data) {
      if (err)
        logger.verbose(
          util.format('%s: Failed to get status file: %s with error: %s',
            who, global.config.jobStatusPath, err
          )
        );
      else {
        logger.verbose(
          util.format('%s: Found status file: %s with content %s',
            who, global.config.jobStatusPath, JSON.stringify(data)
          )
        );

        // If a status has already been set due to cancel/timeout, skip
        // status update.
        if (!_.isEmpty(data))
          bag.skipStatusUpdate = true;
      }

      return next(err);
    }
  );
}

function _setStatus(bag, next) {
  if (bag.skipStatusUpdate) return next();

  var who = bag.who + '|' + _setStatus.name;
  logger.verbose(who, 'Inside');

  var errorCode = bag.exitCode ? 'failure' : 'success';
  fs.writeFile(global.config.jobStatusPath, errorCode,
    function (err) {
      if (err)
        logger.verbose(
          util.format('%s: Failed to set status file: %s with error: %s',
            who, global.config.jobStatusPath, err
          )
        );
      else
        logger.verbose(
          util.format('%s: Updated status file: %s with content %s',
            who, global.config.jobStatusPath, errorCode
          )
        );

      return next(err);
    }
  );
}

function _setExecutorAsReqProc(bag, next) {
  var who = bag.who + '|' + _setExecutorAsReqProc.name;
  logger.verbose(who, 'Inside');

  var content = 'reqProc\n';
  fs.writeFile(global.config.jobWhoPath, content,
    function (err) {
      if (err)
        logger.error(
          util.format('%s: Failed to set executor file: %s with err %s',
            who, global.config.jobWhoPath, err
          )
        );
      else
        logger.verbose(
          util.format('%s: Updated executor file: %s with content: %s',
            who, global.config.jobWhoPath, JSON.stringify(content)
          )
        );

      return next(err);
    }
  );
}
