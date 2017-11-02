'use strict';

var worker = require('./worker.js');
var path = require('path');
var _ = require('underscore');

function setupGlobals() {
  global.who = 'reqKick|reqKick.app.js';
  global.logger = require('./common/logger.js')();
  // TODO: Add an ENV for this.
  logger.level = 'debug';
}

function checkENVs() {
  var who = global.who + '|' + checkENVs.name;
  logger.verbose(who, 'Inside');

  var expectedENVs = [
    'STATUS_DIR'
  ];

  var errors = [];
  _.each(expectedENVs,
    function (expectedENV) {
      if (_.isEmpty(process.env[expectedENV]))
        errors.push(util.format('Missing ENV %s', expectedENV));
    }
  );

  if (!_.isEmpty(errors)) {
    _.each(errors,
      function (error) {
        logger.error(error);
      }
    );

    process.exit(1);
  }
}

function setupConfig() {
  var who = global.who + '|' + setupConfig.name;
  logger.verbose(who, 'Inside');

  global.config = {
    statusDir: process.env.STATUS_DIR,
    pollIntervalMS: 5000
  };

  global.config.jobWhoPath = path.join(global.config.statusDir, 'job.who');
  global.config.jobStatusPath =
    path.join(global.config.statusDir, 'job.status');
  global.config.jobENVPath =
    path.join(global.config.statusDir, 'job.env');
}

function reqKick() {
  setupGlobals();
  checkENVs();
  setupConfig();
  worker();
}

reqKick();
