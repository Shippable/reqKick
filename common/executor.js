'use strict';

var async = require('async');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var util = require('util');

module.exports = function (callback) {
  var who = util.format('%s|common|%s', global.who, 'executor');
  logger.info(who, 'Inside');

  var bag = {
    who: who,
    reqKickScriptNames: null,
    exitCode: 0
  };

  async.series(
    [
      _readScripts.bind(null, bag),
      _executeSteps.bind(null, bag),
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

function _executeSteps(bag, next) {
  if (bag.exitCode) return next();

  var who = bag.who + '|' + _executeSteps.name;
  logger.verbose(who, 'Inside');

  async.eachSeries(
    bag.reqKickScriptNames,
    function (scriptName, nextScriptName) {
      var execCmd = util.format(
        '%s %s %s',
        global.config.reqExecBinPath,
        path.join(global.config.scriptsDir, scriptName),
        global.config.jobENVPath
      );

      logger.verbose(util.format('%s: Executing: %s', who, execCmd));
      exec(execCmd,
        function (err) {
          if (err)
            logger.warn(
              util.format('%s: Execution of %s failed with error: %s',
                who, execCmd, err
              )
            );
          return nextScriptName(err);
        }
      );
    },
    function (err) {
      if (err)
        bag.exitCode = 1;
      return next();
    }
  );
}

function _setStatus(bag, next) {
  var who = bag.who + '|' + _setStatus.name;
  logger.verbose(who, 'Inside');

  // TODO: Remove this once reqProc can handle exit codes.
  var errorCode = bag.exitCode ? '4003' : '4002';
  fs.writeFile(global.config.jobStatusPath, errorCode,
    function (err) {
      if (true)
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
