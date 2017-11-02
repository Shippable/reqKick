'use strict';

var fs = require('fs');
var util = require('util');
var async = require('async');
var dotenv = require('dotenv');
var exec = require('child_process').exec;
var ConsolesAdapter = require('./shippable/ConsolesAdapter.js');

module.exports = function (callback) {
  var who = util.format('%s|common|%s', global.who, 'executor');
  logger.info(who, 'Inside');

  var bag = {
    who: who,
    consolesAdapter: null,
    steps: null
  };

  async.series([
      _instantiateConsolesAdapter.bind(null, bag),
      _readTasks.bind(null, bag),
      _executeSteps.bind(null, bag),
      _setSuccessStatus.bind(null, bag),
      _setExecutorAsReqProc.bind(null, bag)
    ],
    function (err) {
      if (err)
        logger.error(who, 'Failed to process message with error:', err);
      else
        logger.info(who, 'Successfully processed message');

      callback(err);
    }
  );
};

function _instantiateConsolesAdapter(bag, next) {
  var who = bag.who + '|' + _instantiateConsolesAdapter.name;
  logger.verbose(who, 'Inside');

  fs.readFile(global.config.jobENVPath, 'utf8',
    function (err, data) {
      if (err) {
        logger.warn(who, 'Failed to read job ENVs: ', err);
      } else {
        var envs = dotenv.parse(data);
        bag.consolesAdapter = new ConsolesAdapter(
          envs.SHIPPABLE_API_URL,
          envs.BUILDER_API_TOKEN,
          envs.BUILD_JOB_ID
        );
      }

      return next(err);
    }
  );
}

function _readTasks(bag, next) {
  var who = bag.who + '|' + _readTasks.name;
  logger.verbose(who, 'Inside');

  bag.consolesAdapter.openGrp('Preparing tasks');
  bag.consolesAdapter.openCmd('Reading job steps');
  fs.readFile(global.config.jobStepsPath, 'utf8',
    function (err, data) {
      if (err) {
        bag.consolesAdapter.publishMsg(
          util.format('%s: failed to read job steps: %s',
            who, err
          )
        );
        bag.consolesAdapter.closeCmd(false);
        bag.consolesAdapter.closeGrp(false);
      } else {
        bag.tasks = JSON.parse(data);
        bag.consolesAdapter.publishMsg(
          util.format('Read job steps successfully',
            global.config.jobStatusPath
          )
        );
        bag.consolesAdapter.closeCmd(true);
        bag.consolesAdapter.closeGrp(true);
      }

      return next(err);
    }
  );
}

function _executeSteps(bag, next) {
  var who = bag.who + '|' + _executeSteps.name;
  logger.verbose(who, 'Inside');

  async.eachSeries(bag.tasks,
    function (task, nextTask) {

      async.eachSeries(task.reqKick.steps,
        function (step, nextStep) {
          bag.consolesAdapter.openGrp(util.format('%s: %s',
            task.reqKick.name, step.group)
          );
          bag.consolesAdapter.openCmd(step.script);
          exec(step.script,
            function (err, stdout, stderr) {
              bag.consolesAdapter.publishMsg(stdout);
              bag.consolesAdapter.publishMsg(stderr);
              bag.consolesAdapter.closeGrp(!err);
              bag.consolesAdapter.closeCmd(!err);
              return nextStep(err);
            }
          );
        },
        function (err) {
          return nextTask(err);
        }
      );
    },
    function (err) {
      return next(err);
    }
  );
}

function _setSuccessStatus(bag, next) {
  var who = bag.who + '|' + _setSuccessStatus.name;
  logger.verbose(who, 'Inside');

  bag.consolesAdapter.openCmd('Setting status to success');
  fs.writeFile(global.config.jobStatusPath, '4002',
    function (err) {
      if (err) {
        bag.consolesAdapter.publishMsg(
          util.format('%s: failed to set status: %s',
            who, err
          )
        );
        bag.consolesAdapter.closeCmd(false);
      } else {
        bag.consolesAdapter.publishMsg(
          util.format('Updated %s with status success',
            global.config.jobStatusPath
          )
        );
        bag.consolesAdapter.closeCmd(true);
      }

      return next(err);
    }
  );
}

function _setExecutorAsReqProc(bag, next) {
  var who = bag.who + '|' + _setExecutorAsReqProc.name;
  logger.verbose(who, 'Inside');

  bag.consolesAdapter.openCmd('Setting executor as reqProc');
  fs.writeFile(global.config.jobWhoPath, 'reqProc\n',
    function (err) {
      if (err) {
        bag.consolesAdapter.publishMsg(
          util.format('%s: failed to set executor: %s',
            who, err
          )
        );
        bag.consolesAdapter.closeCmd(false);
      } else {
        bag.consolesAdapter.publishMsg(
          util.format('Updated %s with executor reqProc',
            global.config.jobWhoPath
          )
        );
        bag.consolesAdapter.closeCmd(true);
      }

      return next(err);
    }
  );
}
