'use strict';
/* uiPetri module */
angular.module('uiPetri', [
  'ui.router',
  'ui.bootstrap',
  'ngGrid',
  'ngResource',
  'ui.select2',
  'wixAngular',
  'uiPetriServices',
  'angularFileUpload',
  'debounce'
]).config(["$stateProvider", "$urlRouterProvider", function ($stateProvider, $urlRouterProvider) {
  //states definition
  $urlRouterProvider  // If the url is ever invalid, e.g. '/asdf', then redirect to '/' aka the home state
    .when('view/experiment/:experimentId/', '/view/experiment/:experimentId/general').otherwise('/login/home/active');
  $stateProvider.state('login', {
    abstract: true,
    access: 'public',
    url: '/login',
    templateUrl: 'views/login.html',
    controller: 'loginController'
  }).state('login.reconnect', {
    access: 'public',
    url: '/reconnect',
    views: {
      '': {
        templateUrl: 'views/reconnect.html',
        controller: 'errorController'
      }
    }
  })
    .state('login.h', {
      access: 'public',
      url: '/home/:state',
      views: {
        '': {
          templateUrl: 'views/all.html',
          controller: 'allExperiments'
        },

        status: {
          templateUrl: 'views/status.html'
        }
      }
    })
    .state('login.specs', {
      access: 'public',
      url: '/specs',
      views: {
        '': {
          templateUrl: 'views/allSpecs.html',
          controller: 'allSpecs'
        },

        status: {
          templateUrl: 'views/status.html'
        }
      }
    })
    .state('view', {
      abstract: true,
      url: '/view',
      template: '<ui-view/>'

    }).state('view.experiment', {
      access: 'public',
      url: '/experiment/:experimentId/:state',
      views: {
        login: {
          templateUrl: 'views/login.html',
          controller: 'loginController'
        },
        '': {
          templateUrl: 'views/experimentView.html',
          controller: 'experimentView'
        }
      }
    });
}])
  .run(["$rootScope", "$state", "$stateParams", "$log", "clientConfig", function ($rootScope, $state, $stateParams, $log, clientConfig) {
    $rootScope.clientConfig = clientConfig;
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
    $rootScope.$on('$stateChangeStart', function (event, next, nextParams, from, fromParam) {
      $log.info('on $routeChangeStart. changed to ', next, 'params ', nextParams, ' came from  ', from, 'with params ', fromParam);
    });
    $rootScope.$on('$stateChangeSuccess', function (event, to) {
      $log.info('transition to ', to, ' succeeded');

    });
  }]);

'use strict';
angular.module('uiPetriServices', ['ngResource', 'ng'])
  .constant('BASE_API', '/v1/')

  .factory('specs', ["$resource", "api", function ($resource, api) {

    var specs = {};

    specs.restApi = $resource(api.specs);

    return specs;
  }])
  .factory('removeSpec', ["$resource", "api", function ($resource, api) {

    var removeSpec = {};

    removeSpec.restApi = $resource(api.removeSpec, {}, {
      remove: { method: 'POST', params: {specKey: '@specKey'} }
    });

    removeSpec.remove = function (specKey, onsuccess, onfail) {
      removeSpec.restApi.remove({specKey: specKey}, undefined, onsuccess, onfail);
    };
    return removeSpec;
  }])
  .factory('spec', ["$resource", "api", function ($resource, api) {

    var spec = {};

    spec.restApi = $resource(api.spec);

    return spec;
  }])
  .factory('Experiment', ["$resource", "api", "tmService", "_", function ($resource, api, tmService, _) {

    var Experiment = {};

    Experiment.restApi = $resource(api.Experiment, {}, {
      get: { method: 'GET', params: {experimentId: '@experimentId'}},
      update: { method: 'PUT', params: {experimentId: '@experimentId'} }
    });

    Experiment.restStop = $resource(api.stopExperiment, {}, {
      stop: { method: 'POST', headers: {'Content-Type': 'text/plain'}, params: {experimentId: '@experimentId'} }
    });

    Experiment.restPause = $resource(api.pauseExperiment, {}, {
      pause: { method: 'POST', headers: {'Content-Type': 'text/plain'}, params: {experimentId: '@experimentId'} }
    });
    Experiment.restResume = $resource(api.resumeExperiment, {}, {
      resume: { method: 'POST', headers: {'Content-Type': 'text/plain'}, params: {experimentId: '@experimentId'} }
    });
    Experiment.restExperimentSkeleton = $resource(api.experimentSkeleton);
    Experiment.restExperimentHistory = $resource(api.history, {}, {
      query:  {method: 'GET', params: {experimentId: '@experimentId'}, isArray: true }           /*payload*/
    });

    Experiment.info = function (e) {
      var info = {lines: [], id: e.id, key: e.key};
      var groups = e.groups;
      _.each(groups, function (group) {
        info.lines.push({value: group.value, id: e.id, idValue: group.id, chunk: group.chunk});

      });
      return info;
    };

    Experiment.update = function (experiment, onsuccess, onfail) {
      var experiment1 = angular.copy(experiment);
      delete experiment1.info;
      delete experiment1.actions;
      Experiment.restApi.update({experimentId: experiment1.id}, experiment1, onsuccess, onfail);
    };

    function normalizeUndefinedString(str) {
      return (str === undefined || str === '') ? 'no comment' : str;
    }

    Experiment.stop = function (experimentId, comment, onsuccess, onfail) {

      Experiment.restStop.stop({experimentId: experimentId}, normalizeUndefinedString(comment), onsuccess, onfail);
    };

    Experiment.pause = function (experimentId, comment, onsuccess, onfail) {
      Experiment.restPause.pause({experimentId: experimentId}, normalizeUndefinedString(comment), onsuccess, onfail);
    };

    Experiment.resume = function (experimentId, comment, onsuccess, onfail) {
      Experiment.restResume.resume({experimentId: experimentId}, normalizeUndefinedString(comment), onsuccess, onfail);
    };

    Experiment.history = function (experiment, onsuccess, onfail) {
      Experiment.update(experiment, onsuccess, onfail);
    };

    return Experiment;
  }])
  .factory('Experiments', ["$resource", "api", function ($resource, api) {
    var Experiments = {};
    Experiments.restApi =  $resource(api.experiments, {},
      {create: { method: 'POST' }});

    return Experiments;
  }])
  .factory('Specs', ["$resource", "api", function ($resource, api) {
    var Specs = {};
    Specs.restApi =  $resource(api.specs);

    return Specs;
  }])
  .factory('EditStatus', ["$http", "api", function ($http, api) {
    var EditStatus = {};
    EditStatus.get = function () {
      return $http.get(api.editStatus)
        .then(function (response) {
          return response.data;
        });
    };

    return EditStatus;
  }])
  .factory('Reports', ["$http", "api", "$upload", "$q", function ($http, api, $upload, $q) {
    var Reports = {};
    Reports.postAReport = function (fileObj, experimentId) {
      return $upload.upload({
        url: api.reports + experimentId,
        method: 'POST',
        file: fileObj
      }).then(function (res) {
        return res.data;
      }, function (res) {
        return $q.reject(res.data);
      });
    };
    Reports.getAReportUrl = function (originalExperimentId) {
      return $http.get(api.reports + originalExperimentId)
        .then(function (res) {
          return res.data;
        }, function (res) {
          return $q.reject(res.data);
        });
    };

    return Reports;
  }])
  .factory('ExposureId', ["$http", "api", "$upload", "$q", function ($http, api, $upload, $q) {
    var ExposureId = {};
    ExposureId.post = function (spec, exposureId) {
      return $http.post(api.specExposure, {key: spec, exposureId: exposureId})
        .then(function (res) {
        return res.data;
      }, function (res) {
        return $q.reject(res.data);
      });
    };
    return ExposureId;
  }])
  .factory('ReportMetric', ["$http", "api", function ($http, api) {
    var ReportMetric = {};
    ReportMetric.getReportMetric = function (originalExperimentId) {
      return $http.get(api.reportMetric + originalExperimentId)
        .then(function (res) {
          return res.data;
        });
    };

    return ReportMetric;
  }])
  .factory('MetaData', ["$resource", "api", "$http", "configData", "$timeout", function ($resource, api, $http, configData, $timeout) {
    var MetaData = {};

    MetaData.Config = configData.data;

    MetaData.restApi = {};

    var busyWait = function (predicate, callback) {
      if (predicate()) {
        callback();
        return;
      }
      $timeout(function () {
        busyWait(predicate, callback);
      }, 100);
    };

    MetaData.initSynch = function (callback) {
      MetaData.init();
      busyWait(function () {
        return MetaData.inititialized[0] && MetaData.inititialized[1];
      }, callback);
    };
    MetaData.getSpec = function (map, scope, key) {
      return _.find(map[scope], function (e) {
        return (configData.isPublicScope(scope)) ? true /*1 and only 1 spec is available*/ : angular.lowercase(e.key) ===  angular.lowercase(key);
      });
    };

    MetaData.getExposureIdForProductAndSpec = function (productMap, product, specKey) {
      var foundExposureId = null;
      if (product) {
        productMap[product].forEach(function (specObj) {
          if (specObj.key === specKey) {
            foundExposureId = specObj.exposureId;
          }
        });
      }
      return foundExposureId;
    };

    MetaData.initScopeMap = function () {
      return MetaData.restApi._scopesmap.get(function (res) {
        MetaData.restApi.scopesmap = res;
        MetaData.scopes = [];
        _.each(MetaData.restApi.scopesmap, function (value, key) {
          if (key !== '$promise' && key !== '$resolved') {
            MetaData.scopes.push(key);
          }
        });
      }, function () {
      });
    };

    MetaData.initExposures = function () {
      return MetaData.restApi.exposures.query(function (res) {
        MetaData.exposures = [];
        _.each(res, function (value, key) {
          if (key !== '$promise' && key !== '$resolved') {
            MetaData.exposures.push(value);
          }
        });
      }, function () {
      });
    };
    MetaData.init = function () {

      if (MetaData.called) {
        return;
      }
      MetaData.inititialized = [false, false];
      MetaData.called = true;
      MetaData.restApi.geo.query(function (res) {
        MetaData.restApi.geo = res;

        MetaData.inititialized[0] = true;
      });

      MetaData.restApi.userAgentRegexes.query(function (res) {
        var allItems = res;
        var userAgentRegexesText = _.pluck(allItems, 'text');
        var userAgentRegexesId = _.pluck(allItems, 'id');
        allItems = [];
        userAgentRegexesText.forEach(function (elem, i) {
          allItems.push({text: elem + ' [' + userAgentRegexesId[i] + ']', id: userAgentRegexesId[i]});
        });
        MetaData.restApi.userAgentRegexes = allItems;
        MetaData.inititialized[0] = true;
      });

      MetaData.restApi.languages.query(function (res) {
        MetaData.restApi.languages = res;

        MetaData.inititialized[1] = true;
      });

      MetaData.restApi.excludeUserGroups.query(function (res) {
        MetaData.restApi.excludeUserGroups = res;

        MetaData.inititialized[0] = true;
      });
    };

    MetaData.restApi.excludeUserGroups =     $resource(api.excludeUserGroups);

    MetaData.restApi.geo =     $resource(api.geo);

    MetaData.restApi.userAgentRegexes =     $resource(api.userAgentRegexes);

    MetaData.restApi.languages = $resource(api.languages);

    MetaData.restApi.products =  $resource(api.products, {}, {
      query:  {method: 'GET', isArray: false }           /*payload*/
    });

    MetaData.restApi._scopesmap =      $resource(api.scopesmap, {}, {    //should be recalled on every change
      query:  {method: 'GET', isArray: false }           /*payload*/
    });

    MetaData.restApi.exposures = $resource(api.exposures);

    return MetaData;
  }]).factory('api', ["BASE_API", function (BASE_API) {
    var api = {};

    api.Experiment = BASE_API + 'Experiment/:experimentId';
    api.stopExperiment = BASE_API + 'Experiment/:experimentId/terminate';
    api.pauseExperiment = BASE_API + 'Experiment/:experimentId/pause';
    api.resumeExperiment = BASE_API + 'Experiment/:experimentId/resume';
    api.history = BASE_API + 'Experiment/History/:experimentId';
    api.experiments = BASE_API + 'Experiments';
    api.specs = BASE_API + 'Specs';
    api.removeSpec = BASE_API + 'deleteSpecs/:specKey';
    api.editStatus = BASE_API + 'experiments/editStatus';
    api.reports = BASE_API + 'reports/';
    api.reportMetric = BASE_API + 'Experiments/report/';
    api.experimentSkeleton = BASE_API + 'ExperimentSkeleton';
    api.geo = BASE_API + 'geo';
    api.userAgentRegexes = BASE_API + 'userAgentRegexes';
    api.excludeUserGroups = BASE_API + 'userGroups';
    api.languages = BASE_API + 'languages';
    api.products = BASE_API + 'products';
    api.scopesmap = BASE_API + 'productmap';
    api.exposures = BASE_API + 'exposures';
    api.specExposure = BASE_API + 'specExposure';
    api.isAuthenticated = '/auth/isAuthenticated';
    return api;
  }]).factory('utils', function () {
    return {
      // Util for finding an object by its 'id' property among an array
      findById: function findById(a, id) {

        for (var i = 0; i < a.length; i++) {
          if (a[i].id === id) {
            return a[i];
          }
        }
        return null;
      },
      findByName: function findByName(a, name) {
        for (var i = 0; i < a.length; i++) {
          if (a[i].name === name) {
            return a[i];
          }
        }
        return null;
      }
    };
  })
  .factory('ExperimentDataType', function () {
    var ExperimentDataType = {};

    var featureToggle = 'featureToggle';

    ExperimentDataType.experimentTypeName = function (type) {
      return type === featureToggle ? 'Feature Toggle' : 'AB Test';
    };
    ExperimentDataType.experimentTypeSymbol = function (type) {
      return type === featureToggle ? 'FT ' : 'AB ';
    };
    ExperimentDataType.experimentType = function (isFeatureToggle) {
      return isFeatureToggle ? 'featureToggle' : 'abTest';
    };

    ExperimentDataType.experimentState = {
      type: function (stateFromServer) {
        return stateFromServer.toLowerCase();
      },
      StateEnded: 'ended',
      StateFuture: 'future',
      StateActive: 'active',
      StatePaused: 'paused'
    };

    ExperimentDataType.actions = {
      pause: {op: 'pause', text: 'Pause'},
      terminate: {op: 'terminate', text: 'Terminate'},
      edit: {op: 'edit', text: 'Edit'},
      duplicate: {op: 'duplicate', text: 'Duplicate'},
      history: {op: 'history', text: 'History'},
      resume: {op: 'resume', text: 'Resume'},
      reports: {op: 'reports', text: 'Jira Reports'},
      reportMetric: {op: 'reportMetric', text: 'Exp. Report'},
      override: {op: 'override', text: 'Override Params'},

      getActionsByState: function (id, state) {
        var actions = [];
        var map = ExperimentDataType.actions;
        switch (state) {
          case ExperimentDataType.experimentState.StateFuture:
            actions = [map.terminate, map.edit, map.duplicate, map.history, map.reports, map.reportMetric, map.override];
            break;
          case ExperimentDataType.experimentState.StateActive:
            actions = [map.pause, map.terminate, map.edit, map.duplicate, map.history, map.reports, map.reportMetric, map.override];
            break;
          case ExperimentDataType.experimentState.StatePaused:
            actions = [map.resume, map.terminate, map.edit, map.duplicate, map.history, map.reports, map.reportMetric, map.override];
            break;
          default:
            actions = [map.duplicate, map.history, map.reports, map.reportMetric];
        }
        return {id: id, actions: actions};
      },
      name: function (action) {
        return action.charAt(0).toUpperCase() + action.substr(1);
      }
    };
    return ExperimentDataType;
  })
  .factory('_', ["$window", function ($window) {
    return $window._;
  }])
  .factory('AuthenticationService', ["$http", "clientConfig", function ($http, clientConfig) {
    var serverUrl = '/v1';
    var login =  {
      login: false,
      action: '',
      label: '',
      user: ''
    };

    var authenticationService = {
      isBoAuthenticated: function (useBoAuthentication, onSuccess) {
        if (!clientConfig.production) {
          login.login = true;
          login.action = '';
          login.user = '';

          onSuccess(login);
          return;
        }
        $http({
          method: 'GET',
          url: serverUrl + '/isBoAuthenticated'
        }).success(function () {
          login.login = true;
          login.label = 'logout';

          onSuccess(login);
        }).error(function () {
          login.label = 'login';
          login.login = false;
          onSuccess(login);

        });
      },
      isAuthenticated: function (useBoAuthentication, onSuccess) {
        if (!clientConfig.production) {
          login.login = true;
          login.action = '';
          login.user = '';

          onSuccess(login);
          return;
        }
        $http({
          method: 'GET',
          url: serverUrl + '/isAuthenticated'
        }).success(function (data) {
          login.login = data === 'true';

          if (login.login) {
            login.label = 'logout';
          } else {
            login.label = 'login';
          }
          onSuccess(login);
        }).error(function () {
        });
      },
      bologout: function (onSuccess) {
        login.label = 'login';
        login.login = false;
        login.user = undefined;
        onSuccess(login);
      },
      logout: function (onSuccess) {
        $http({
          method: 'GET',
          url: serverUrl + '/logout'
        }).success(function () {
          login.label = 'login';
          login.login = false;
          login.user = undefined;
          onSuccess(login);
        });
      },

      getUser: function (onSuccess) {
        if (!clientConfig.production) {

          onSuccess('');
          return;
        }
        $http({
          method: 'GET',
          url: serverUrl + '/getUser'
        }).success(function (data) {
          onSuccess(data.email);
        }).error(function () {
        });
      },
      getBoUser: function (onSuccess) {
        if (!clientConfig.production) {

          onSuccess('StagingUser');
          return;
        }
        $http({
          method: 'GET',
          url: serverUrl + '/getBoUser'
        }).success(function (data) {
          onSuccess(data);
        }).error(function () {
        });
      }
    };

    return authenticationService;
  }]);

'use strict';

angular.module('uiPetri')
  .factory('gridService', function () {
    var gridService = {};

    gridService.selected = '';
    gridService.setSelected = function (value) {
      gridService.selectedItems = value;
    };

    return gridService;
  });

'use strict';

angular.module('uiPetri')
  .factory('alertsService', ["_", function (_) {
    var alertTemplates = {
      experimentOnSpecAlert: { type: 'warning', msg: 'WARNING : Experiment on %1 already exists', msgEx: 'make sure all experiments are mutually exclusive (dont overlap)'},
      experimentNotEditable: { type: 'info', msg: 'INFO : Experiment %1 is not editable ', msgEx: 'REASON : another experiment, [Html-Editor : %2], is open '},
      experimentNotEditableScope: { type: 'info', msg: 'INFO : Experiment %1 is not editable ', msgEx: 'REASON : not editable scope: %2'},
      openToAll: {type: 'danger', msg: 'Experiment is Open To All !!!'},
      geoRemoved: {type: 'danger', msg: 'Countries Removed: %1'},
      excludeUserGroupsRemoved: {type: 'danger', msg: 'Excluded Users Group Removed: %1'},
      includeUserAgentRegexesRemoved: {type: 'danger', msg: 'In. user agents Removed: %1'},
      excludeUserAgentRegexesRemoved: {type: 'danger', msg: 'Ex. user agents Removed: %1'},
      languagesRemoved: {type: 'danger', msg: 'Languages Removed: %1'},
      hostsRemoved: {type: 'danger', msg: 'Hosts Removed: %1'},
      guidsFilterTypeChanged: {type: 'warning', msg: 'Guids filter type changed to: %1'},
      includeGuidsRemoved: {type: 'info', msg: 'In. GUIDs Removed: %1'},
      metaSiteIdsRemoved: {type: 'info', msg: 'Meta Site Ids Removed: %1'},
      conductLimitChanged: {type: 'info', msg: 'Conduct Limit changed to: %1'},
      excludeGuidsRemoved: {type: 'info', msg: 'Ex. GUIDs Removed: %1'},
      wixUsersRemoved: {type: 'warning', msg: 'Experiment is no longer open to wix users'},
      anonymousRemoved: {type: 'warning', msg: 'Anonymous filter removed'},
      allRegisteredRemoved: {type: 'warning', msg: 'allRegistered filter removed'},
      newRegisteredRemoved: {type: 'warning', msg: 'newRegistered filter removed'},
      nonRegisteredRemoved: {type: 'warning', msg: 'nonRegistered filter removed'},
      type: {type: 'warning', msg: 'Experiment type became %1'},
      groups: {type: 'warning', msg: 'Experiment Test Groups became %1'},
      startDate: {type: 'info', msg: 'Start date became %1'},
      endDate: {type: 'info', msg: 'End date became %1'},
      wixUsersOnly: {type: 'info', msg: 'Experiments is Open to Wix Users Only'},
      wixUsersAdded: {type: 'info', msg: 'Experiment is open to wix users'},
      anonymousAdded: {type: 'info', msg: 'anonymous filter Added'},
      allRegisteredAdded: {type: 'info', msg: 'allRegistered filter Added'},
      newRegisteredAdded: {type: 'info', msg: 'newRegistered filter Added'},
      nonRegisteredAdded: {type: 'info', msg: 'nonRegistered filter Added'},
      geoAdded: {type: 'info', msg: 'Countries Added: %1'},
      excludeUserGroupsAdded: {type: 'info', msg: 'Excluded User Group Added: %1'},
      includeUserAgentRegexesAdded: {type: 'info', msg: 'In. user agents Added: %1'},
      excludeUserAgentRegexesAdded: {type: 'info', msg: 'Ex. user agents Added: %1'},
      geoBoolean: {type: 'warning', msg: 'geo filter changed %1'},
      metaSiteIdBoolean: {type: 'warning', msg: 'Meta site id filter changed %1'},
      languagesAdded: {type: 'info', msg: 'Languages Added: %1'},
      hostsAdded: {type: 'info', msg: 'Hosts Added: %1'},
      includeGuidsAdded: {type: 'info', msg: 'In. GUIDs Added: %1'},
      metaSiteIdsAdded: {type: 'info', msg: 'Meta Site Ids Added: %1'},
      excludeGuidsAdded: {type: 'info', msg: 'Ex. GUIDs Added: %1'},
      users: {type: 'info', msg: 'Users Filter changed to: %1'}

    };

    return {
      alerts: [],
      addAlert: function (alert, param1, param2, param3, param4, param5) {
        this.alerts = _.filter(this.alerts, function (e) {
          return (e.name !== alert);
        });
        var newAlert =   {
          name: alert,
          msg: alertTemplates[alert].msg
            .replace('%1', param1)
            .replace('%2', param2)
            .replace('%3', param3)
            .replace('%4', param4)
            .replace('%5', param5),
          msgEx: alertTemplates[alert].msgEx ? alertTemplates[alert].msgEx
            .replace('%1', param1)
            .replace('%2', param2)
            .replace('%3', param3)
            .replace('%4', param4)
            .replace('%5', param5) :
            undefined,
          type: alertTemplates[alert].type
        };
        this.alerts.push(newAlert);
        return this.alerts;
      },
      removeAlert: function (alert) {
        this.alerts = _.filter(this.alerts, function (e) {
          return (e.name !== alert);
        });
      },
      removeAll: function () {
        this.alerts = [];
        return this.alerts;
      },
      get: function (alert) {
        this.alerts = _.filter(this.alerts, function (e) {
          return (e.name === alert);
        });
        return this.alerts[0];
      }
    };
  }]);

'use strict';

angular.module('uiPetri')
  .factory('tmService', function () {
    var methods = {};

    methods.n2dt = function (value) {
      return new Date(value);
    };

    methods.dt2n = function (value) {
      return value.getTime();
    };

    methods.yearFrom = function (dt) {
      return new Date(dt.getTime() + 365 * 24 * 60 * 60  * 1000);
    };

    methods.minutesFrom = function (dt, minutes) {
      return new Date(dt.getTime() + minutes * 60  * 1000);
    };

    methods.now = function () {
      return new Date();
    };
    methods.hoursFrom = function (dt, houres) {
      return new Date(dt.getTime() + houres * 60 * 60  * 1000);
    };
    methods.time = function (dt) {
      var d = new Date();
      d.setHours(dt.getHours());
      d.setMinutes(dt.getMinutes());
      return d;
    };

    methods.makeTime = function (dt, tm) {
      var d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), tm.getHours(),  tm.getMinutes(), 0, 0);
      return d;
    };

    return methods;

  });

'use strict';
angular.module('uiPetri')
  .directive('isLoading', ["$log", function ($log) {
    return {
      restrict: 'A',
      scope: {
        isloading: '='
      },
      require: 'ngModel',
      templateUrl: '<div><i class="fa fa-ban fa-3x fa-spinner fa-spin" ng-show="isloading"></i></div>',
      link: function (scope) {
        scope.$watch('isloading', function (oldVal, newVal) {
          if (newVal) {
            scope.states = [];
            for (var i = 0; i < newVal.length; i++) {
              scope.isloading = newVal;
            }
            $log.log(scope.states);
          }
        });
      }
    };
  }])
  .directive('ngActivities', ["$log", function ($log) {
    return {
      restrict: 'A',
      scope: {
        activitiesStates: '='
      },
      templateUrl: 'views/activityPanel.html',
      link: function (scope) {
        scope.$watch('activitiesStates', function (oldVal, newVal) {
          if (newVal) {
            scope.states = [];
            for (var i = 0; i < newVal.length; i++) {
              scope.states.push('images/"+newVal[i]+".png');
            }

            $log.log(scope.states);
          }
        });
      }
    };
  }])
  .directive('accessLevel', ["AuthenticationService", "$http", function (AuthenticationService, $http) {
    return {
      restrict: 'A',
      controller: 'headerController',
      scope: {
        athorized: '='
      },

      link: function ($scope, element, attrs) {

        $http.get('/api/auth/isAuthenticated').success(function (data) {
          var display = 'none';
          if (attrs.athorized === 'auth') {
            if (data) {
              display = 'display';
            }

          }
          if (attrs.athorized === 'public') {
            display = 'display';
          }
          element.css('display', display);
        })
          .error(function () {
            var display = 'none';
            if (attrs.athorized === 'public') {
              display = 'display';
            }
            element.css('display', display);
          });
      }
    };
  }])

  .directive('myValue', function () {
    return {
      restrict: 'A',
      scope: {
        validator: '='
      },
      require: 'ngModel',
      link: function (scope, elm, attrs, ctrl, $eval) {
        ctrl.$parsers.unshift(function (viewValue) {
          if ($eval(scope.validator(viewValue))) {
            // it is valid
            ctrl.$setValidity('integer', true);
            return viewValue;
          } else {
            // it is invalid, return undefined (no model update)
            ctrl.$setValidity('integer', false);
            return undefined;
          }
        });
      }
    };
  })
  .directive('draggable', ["$document", function ($document) {
    return function (scope, element) {
      var startX = 0, startY = 0, x = 0, y = 0;
      element.css({
        position: 'relative',
        cursor: 'pointer'
      });
      element.on('mousedown', function (event) {
        // Prevent default dragging of selected content
        event.preventDefault();
        startX = event.screenX - x;
        startY = event.screenY - y;
        $document.on('mousemove', mousemove);
        $document.on('mouseup', mouseup);
      });

      function mousemove(event) {
        y = event.screenY - startY;
        x = event.screenX - startX;
        element.css({
          top: y + 'px',
          left:  x + 'px'
        });
      }
      function mouseup() {
        $document.unbind('mousemove', mousemove);
        $document.unbind('mouseup', mouseup);
      }
    };

  }])
  .directive('loadPane', function () {
    return {
      // This HTML will replace the zippy directive.
      replace: true,
      transclude: true,
      scope: {},
      template: '<div class="load-pane " ><div class="fa fa-ban fa-3x fa-spinner fa-spin"></div></div>',
      link: function (scope, element, attr) {
        scope.$element = element;
        scope.$element.parent().css('position', 'relative');
        scope.$element.css({
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          opacity: 0.8,
          'z-index': '1001',
          'min-height': '40px'
        });

        function setDisplay(visible) {
          var val = (visible) ? 'block' : 'none';
          scope.$element.css('display', val);
        }

        scope.$watch('$parent.' + attr.loadPane, function (val) {
          setDisplay(val);
        });
      }
    };
  })
  .directive('showHide', ["specFilters", function (specFilters) {
    return {
      transclude: true,

      link: function (scope, element, attr) {
        scope.$element = element;

        scope.$watch(attr.showHide, function (value) {
          specFilters.calculate(value);

        });

        function setDisplay(visible) {
          var val = (visible) ? 'block' : 'none';
          scope.$element.css('display', val);
        }

        scope.$watch('$parent.' + attr.showHide, function (val) {
          setDisplay(val);
        });
      }
    };
  }]);

'use strict';

/**
 * Directive that executes an expression when the element it is applied to gets
 * an `escape` keydown event.
 */
angular.module('uiPetri').directive('inputEscape', function () {
  var ESCAPE_KEY = 27;
  return function (scope, elem, attrs) {
    elem.bind('keydown', function (event) {
      if (event.keyCode === ESCAPE_KEY) {
        scope.$apply(attrs.inputEscape);
      }
    });
  };
});

'use strict';

/**
 * Directive that places focus on the element it is applied to when the
 * expression it binds to evaluates to true
 */
angular.module('uiPetri').directive('inputFocus', ["$timeout", function todoFocus($timeout) {
  return function (scope, elem, attrs) {
    scope.$watch(attrs.inputFocus, function (newVal) {
      if (newVal) {
        $timeout(function () {
          elem[0].focus();
        }, 0, false);
      }
    });
  };
}]);

'use strict';
/* global $: false */

angular.module('uiPetri').controller('newExperimentController', ["$scope", "$rootScope", "$timeout", "$log", "Experiment", "Experiments", "$modalInstance", "experimentFormService", "MetaData", "allExperiments", "modalHelper", "alertsService", "ExperimentDataType", "tmService", "modalWizard", "specFilters", "configData", "ExposureId", function ($scope, $rootScope, $timeout, $log, Experiment, Experiments, $modalInstance, experimentFormService, MetaData, allExperiments, modalHelper, alertsService, ExperimentDataType, tmService, modalWizard, specFilters, configData, ExposureId) {

  var self = this;
  self.dataLoading = true;
  self.urlPattern = /^[a-zA-Z0-9-_]+[\/|.]?[a-zA-Z0-9_-]+]?$/;
  alertsService.removeAll();
  self.allexperiments = allExperiments.allexperiments;
  self.comment =  {value: ''};

  /*         w i z a r d        */
  /*         w i z a r d        */

  var displayTab = function (index) {
    $('.tab').css('display', 'none');
    $('#tab' + index).css('display', 'block');
  };
  var onStateChanged = function (state) {
    if (state === undefined) {
      self.close();
      return;
    }
    self.header = state.header;
    self.applyButtonText = state.nextButton;
    self.cancelButtonText = state.prevButton;
    displayTab(state.tab);
  };
  var removeAllAlerts = function () {
    self.alerts = alertsService.removeAll();
  };

  self.confirm = function () {

    self.form.invalid = !experimentFormService.isValid(self.newExperiment, self.filters);
    if (self.form.invalid) {
      return 'invalid';
    }
    var res = experimentFormService.experimentDiff(self.originalExperiment, self.newExperiment);
    if (!res.isDiff) {
      return 'update';
    }
    self.alerts = [];

    _.each(_.keys(res.diff), function (key) {
      if (res.diff[key] !== undefined) {
        alertsService.addAlert(key, res.diff[key]);
      }
      self.alerts = alertsService.alerts;
    });
    return 'expand';
  };

  self.confirmCreate = function () {
    self.form.invalid = !experimentFormService.isValid(self.newExperiment, self.filters);
    if (self.form.invalid) {
      return 'invalid';
    }

    return 'valid';
  };

  self.initFormOnEdit = function () {
    var stateEdit = {
      name: 'start',
      tab: 0,
      onNext: self.confirm,
      nextButton: 'Apply',
      prevButton: 'Cancel',
      onPrev: self.exitScope,
      header: self.header
    };
    var stateConfirm = {
      name: 'end',
      tab: 1,
      onNext: function () {
        return true;
      },
      nextButton: 'Ok',
      prevButton: 'Back',
      onPrev: removeAllAlerts,
      header: 'Confirm Changes...'
    };
    var transactions = [{
      tab: stateEdit,
      result: 'invalid',
      onTransaction: function () {

      },
      nextTab: stateEdit
    }, {
      tab: stateEdit,
      result: 'expand',
      onTransaction: function () {

      },
      nextTab: stateConfirm
    }, {
      tab: stateEdit,
      result: 'update',
      onTransaction: self.editInServer,
      nextTab: undefined
    }, {
      tab: stateConfirm,
      result: true,
      onTransaction: self.editInServer,
      nextTab: undefined
    }];

    modalWizard.init([stateEdit, stateConfirm], transactions, onStateChanged);
  };

  self.initFormOnNew = function () {
    var stateNew = {name: 'start', tab: 0, onNext: self.confirmCreate, nextButton: self.applyButtonText, prevButton: 'Cancel', onPrev: self.exitScope, header: self.header};
    var transactions = [{tab: stateNew, result: 'valid', onTransaction: self.create, nextTab: undefined}];
    modalWizard.init([stateNew], transactions, onStateChanged);
  };

  self.apply = function () {
    self.showErrors = true;
    self.form.invalid = !experimentFormService.isValid(self.newExperiment, self.filters);
    if (self.form.invalid) {
      return;
    }
    modalWizard.next();
  };

  self.cancel = function () {
    modalWizard.prev();
  };

  /*         w i z a r d        */
  /*         w i z a r d        */

  self.onTypeChanged = function (value) {
    $log.info('type changed to ' +  value);

    if (self.filters) {
      self.filters.calculate(self.newExperiment);
    }

  };

  self.onAbTest = function () {
    self.onTypeChanged('abTest');
    if (self.newExperiment.groups.value.length === 0) {
      //public
      return;
    }
    var chunk = Math.floor(100 / self.newExperiment.groups.value.length);
    _.each(self.newExperiment.groups.value, function (e) {
      e.chunk = chunk;
    });
    self.newExperiment.groups.value[0].chunk = 100 - (self.newExperiment.groups.value.length - 1) * chunk;
  };

  self.onFeatureToggle = function () {
    self.onTypeChanged('featureToggle');
    if (self.newExperiment.groups.value.length === 0) {
      //public
      return;
    }
    _.each(self.newExperiment.groups.value, function (e) {
      e.chunk = 0;
    });
    self.newExperiment.featureValue.value = '';

    //not chosing default, force the user do it explicitly
    //self.newExperiment.groups.value[0].chunk = 100;
    //self.newExperiment.featureValue.value = self.newExperiment.groups.value[0].value;
  };

  self.onFeatureToggleChange = function () {

    _.each(self.newExperiment.groups.value, function (e) {
      e.chunk = 0;
    });
    var testGroup = _.find(self.newExperiment.groups.value, function (e) {
      return e.value === self.newExperiment.featureValue.value;
    });
    testGroup.chunk = 100;

  };

  function validateElements(groups, min, max) {
    for (var i = 0; i < groups.length; i++) {

      if (groups[i].chunk > max) {
        groups[i].chunk = max;
      }

      if (_.isNaN(groups[i].chunk) ||  groups[i].chunk < min) {
        groups[i].chunk = min;
      }
    }
  }


  self.onAbChanged = function () {

    var groups = self.newExperiment.groups;
    var i;
    if (groups.value.length < 3) {
      validateElements(groups.value, 1, 99);
    } else {
      validateElements(groups.value, 0, 99);
    }

    if (groups.value.length > 2) {
      return;
    }

    for (i = 0; i < groups.value.length; i++) {

      if (groups.value[i].chunk === groups.origin[i].chunk) {
        groups.value[i].chunk = 100 - groups.value[(i + 1) % 2].chunk;
        break;
      }
    }
    groups.origin = angular.copy(groups.value);
  };

  self.productChanged = function () {
    $log.info('productChanged to ' + self.newExperiment.scope.value);
    self.form.allspecs = self.form.scopesmap[self.newExperiment.scope.value];
    self.enableAddTestGroup = false;

    self.filters = undefined;
    self.newExperiment.isPublicScope = false;
    if (configData.isPublicScope(self.newExperiment.scope.value)) {
      self.newExperiment.isPublicScope = true;
      var theSpec = MetaData.getSpec(self.form.scopesmap, self.newExperiment.scope.value, '');
      self.enableAddTestGroup = (theSpec.groups.length === 0);
      self.placeHolderForFreeKey = configData.placeHolderByScope(self.newExperiment.scope.value);
      self.newExperiment.groups.value = angular.copy(theSpec.groups);
      self.newExperiment.groups.origin = angular.copy(theSpec.groups);
      self.newExperiment.specKey.value = false;

      self.newExperiment.parentStartTime = theSpec.startDate;
      self.newExperiment.key.value = '';
      self.filters = specFilters(self.form.scopesmap);
      self.filters.calculate(self.newExperiment);
    }
    self.newExperiment.key.value = '';

    $('#spec').select2({
      placeholder: 'Choose'
    });
  };

  self.keyChanged = function () {
    $log.info('keyChanged to ' + self.newExperiment.key.value);
    var value = self.newExperiment.key.value;

    if (isExperimentOnSpec(value, self.newExperiment.scope.value)) {
      self.addAlert('experimentOnSpecAlert', value);
    } else {
      self.removeAlert('experimentOnSpecAlert');
    }
    var theSpec;
    if (configData.isPublicScope(self.newExperiment.scope.value)) {
      theSpec = self.form.allspecs[0];
      self.newExperiment.specKey.value = false;
    } else {
      theSpec =  _.where(self.form.allspecs, {key: value})[0];
      self.newExperiment.specKey.value = true;
      self.newExperiment.groups.value = angular.copy(theSpec.groups);
      self.newExperiment.groups.origin = angular.copy(theSpec.groups);
      if (isExperimentOnSpec(theSpec.key, self.newExperiment.scope.value)) {
        self.addAlert('experimentOnSpecAlert', theSpec.key);
      }
    }
    self.filters = specFilters(self.form.scopesmap);
    self.filters.calculate(self.newExperiment);

    self.enableAddTestGroup =  (theSpec.groups.length === 0);

    self.newExperiment.key.value = (self.newExperiment.specKey.value ? theSpec.key : '');

    if (self.newExperiment.type.value === 'featureToggle') {
      self.onFeatureToggle();

    } else {
      self.onAbTest();
    }
    self.newExperiment.parentStartTime = theSpec.startDate;
    setExposureForCurrentSpecAndProduct();
  };

  self.onChangeLinkId = function () {
    $log.info('link changed to ' +  self.newExperiment.linkId);
  };

  self.onStartChanged = function () {
    $log.info('start tm changed to ' +  self.newExperiment.startDate.value);
    self.form.minDateTimeTo = tmService.minutesFrom(self.newExperiment.startDate.value, 1);
    if (self.newExperiment.startDate.disabled) {
      self.newExperiment.startDate.value = self.newExperiment.startDate.origin;
    }
  };

  self.onEndChanged = function () {
    $log.info('end tm changed to ' +  self.newExperiment.endDate.value);
  };

  var getButton = function (filters, id) {
    return _.find(_.values(filters.controllers), function (e) {
      return e.id === id;
    });
  };

  self.onClick = function (id) {
    var filters = self.filters;
    var experiment = self.newExperiment;
    $log.info('on click : id=' + id);
    var selectors =  _.filter(_.values(filters.controllers), function (e) {
      return e.id && e.type && e.type === 'selector';
    });
    filters.btn = getButton(filters, id);
    $log.info('active button became :  id=' + filters.btn.id);

    _.each(selectors, function (e) {
      e.show = _.find(filters.btn.selectors, function (e1) {
        return e1 === e.id || e1.id === e.id;
      });
      e.label = undefined;
      if (e.show) {
        //TODO: move to watcher
        e.label = e.show.label;
      } else {
        experiment[e.id].clean(experiment);
      }

    });

    experiment.wixUsers.value = false;
    experiment.allRegistered.value = false;
    experiment.newRegistered.value = false;
    experiment.nonRegistered.value = false;
    experiment.anonymous.value = false;
    _.each(filters.btn.trueFilter, function (e) {
      experiment[e].value = true;
    });
    if (_.find(_.filter(self.filters.controllers, function (e) {
        return e.type === 'selector';
      }), function (e1) {
        return e1.show;
      })) {
      self.scrollToBottom();
    }
  };

  self.conditionalDiff = function () {
    if (allExperiments.op === 'edit') {
      var res = experimentFormService.experimentDiff(self.originalExperiment, self.newExperiment);
      self.applyDisabled = !res.isDiff;
    }
  };

  self.onChangeGeo = function (newGeo) {
    var newGeoArray = newGeo.id.split(',');
    _.each(newGeoArray, function (id) {
      var added = _.find(MetaData.restApi.geo, function (e) {
        return (e.id === id);
      });
      self.newExperiment.geo.value.push(added);
    });
    self.newExperiment.geo.value = _.uniq(self.newExperiment.geo.value);

    experimentFormService.updateSelectMulty($('#geo'), self.newExperiment.geo.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.onRemoveGeo = function (deletedGeo) {
    self.newExperiment.geo.value = experimentFormService.onRemove(self.newExperiment.geo.value, deletedGeo);
    experimentFormService.updateSelectMulty($('#geo'), self.newExperiment.geo.value);
    self.conditionalDiff();
    $scope.$digest();
  };
  self.onChangeExcludeUserGroups = function (newGroup) {
    var newGroupArray = newGroup.id.split(',');
    _.each(newGroupArray, function (id) {
      var added = _.find(MetaData.restApi.excludeUserGroups, function (e) {
        return (e.id === id);
      });
      self.newExperiment.excludeUserGroups.value.push(added);
    });
    self.newExperiment.excludeUserGroups.value = _.uniq(self.newExperiment.excludeUserGroups.value);

    experimentFormService.updateSelectMulty($('#exclude-user-groups'), self.newExperiment.excludeUserGroups.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.onRemoveExcludeUserGroups = function (deletedGroup) {
    self.newExperiment.excludeUserGroups.value = experimentFormService.onRemove(self.newExperiment.excludeUserGroups.value, deletedGroup);
    experimentFormService.updateSelectMulty($('#exclude-user-groups'), self.newExperiment.excludeUserGroups.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.onChangeIncludeBrowsers = function (newBrowser) {
    var newBrowserArray = newBrowser.id.split(',');
    _.each(newBrowserArray, function (id) {
      var added = _.find(MetaData.restApi.userAgentRegexes, function (e) {
        return (e.id === id);
      });
      self.newExperiment.includeUserAgentRegexes.value.push(added);
    });
    self.newExperiment.includeUserAgentRegexes.value = _.uniq(self.newExperiment.includeUserAgentRegexes.value);

    experimentFormService.updateSelectMulty($('#include-user-agents'), self.newExperiment.includeUserAgentRegexes.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.onRemoveIncludeBrowsers = function (deletedBrowser) {
    self.newExperiment.includeUserAgentRegexes.value = experimentFormService.onRemove(self.newExperiment.includeUserAgentRegexes.value, deletedBrowser);
    experimentFormService.updateSelectMulty($('#include-user-agents'), self.newExperiment.includeUserAgentRegexes.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.onChangeExcludeBrowsers = function (newBrowser) {
    var newBrowserArray = newBrowser.id.split(',');
    _.each(newBrowserArray, function (id) {
      var added = _.find(MetaData.restApi.userAgentRegexes, function (e) {
        return (e.id === id);
      });
      self.newExperiment.excludeUserAgentRegexes.value.push(added);
    });
    self.newExperiment.excludeUserAgentRegexes.value = _.uniq(self.newExperiment.excludeUserAgentRegexes.value);

    experimentFormService.updateSelectMulty($('#exclude-user-agents'), self.newExperiment.excludeUserAgentRegexes.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.onRemoveExcludeBrowsers = function (deletedBrowser) {
    self.newExperiment.excludeUserAgentRegexes.value = experimentFormService.onRemove(self.newExperiment.excludeUserAgentRegexes.value, deletedBrowser);
    experimentFormService.updateSelectMulty($('#exclude-user-agents'), self.newExperiment.excludeUserAgentRegexes.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.onChangeLanguages = function (newLang) {
    self.newExperiment.languages.value.push(newLang);
    experimentFormService.updateSelectMulty($('#lang'), self.newExperiment.languages.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.onRemoveLanguages = function (deleted) {
    self.newExperiment.languages.value = experimentFormService.onRemove(self.newExperiment.languages.value, deleted);
    experimentFormService.updateSelectMulty($('#lang'), self.newExperiment.languages.value);
    self.conditionalDiff();
    $scope.$digest();
  };

  self.guiIdOptions = experimentFormService.initGUIDAndMetaSiteIdOptions('');
  self.selectMetaSiteOptions = experimentFormService.initGUIDAndMetaSiteIdOptions('');

  function changeExposureObjToBeWithExposureId(expId) {
    self.exposureObj = _.find(self.allExposures, function (obj) {
      return obj.id === expId || parseInt(obj.id) === expId;
    });
    if (!self.exposureObj) {
      self.exposureObj = {
        id: null,
        name: 'None'
      };
    }
  }

  function removeLinkedIdWhenLinkedExperimentNotActive() {
    if (!_.find($scope.newExpCtrl.allexperiments, function (e) {
        return self.newExperiment.linkId === e.id;
      })) {
      self.newExperiment.linkId = 0;
    }
  }

  function disableApplyButtonIfSpecNoLongerExists(serverResult) {
    var spec = MetaData.getSpec(MetaData.restApi.scopesmap, serverResult.scope, serverResult.key);
    if (spec === undefined) {
      self.applyDisabled = true;
    }
  }
  function setExposureForCurrentSpecAndProduct() {
    changeExposureObjToBeWithExposureId(MetaData.getExposureIdForProductAndSpec(self.form.scopesmap, self.newExperiment.scope.value, self.newExperiment.key.value));
  }

  function initSelectMultiInFormService() {
    experimentFormService.initSelectMulty('geo', $('#geo'), MetaData.restApi.geo, self.newExperiment.geo.value, self.onChangeGeo, self.onRemoveGeo);
    experimentFormService.initSelectMulty('exclude-user-groups', $('#exclude-user-groups'), MetaData.restApi.excludeUserGroups, self.newExperiment.excludeUserGroups.value, self.onChangeExcludeUserGroups, self.onRemoveExcludeUserGroups);
    experimentFormService.initSelectMulty('include-user-agents', $('#include-user-agents'), MetaData.restApi.userAgentRegexes, self.newExperiment.includeUserAgentRegexes.value, self.onChangeIncludeBrowsers, self.onRemoveIncludeBrowsers);
    experimentFormService.initSelectMulty('exclude-user-agents', $('#exclude-user-agents'), MetaData.restApi.userAgentRegexes, self.newExperiment.excludeUserAgentRegexes.value, self.onChangeExcludeBrowsers, self.onRemoveExcludeBrowsers);
    experimentFormService.initSelectMulty('lang', $('#lang'), MetaData.restApi.languages, self.newExperiment.languages.value, self.onChangeLanguages, self.onRemoveLanguages);
    experimentFormService.initSelectMultyTags('includeGuids', $('#includeGuid'));
    experimentFormService.initSelectMultyTags('excludeGuids', $('#excludeGuid'));
    experimentFormService.initSelectMultyTags('metaSiteIds', $('#metaSiteIds'));
  }

  //fetch all data needed from server
  //TODO: change code in a way that selcetion would be fetched only once

  function prepare(serverResult) {
    var formData = experimentFormService.init(serverResult);
    self.newExperiment = formData.uiExperiment;
    self.form = formData.form;
    setExposureForCurrentSpecAndProduct();
    initSelectMultiInFormService();

    $timeout(function () {
      self.initFormOnNew();
      self.dataLoading = false;
    }, 0);
  }

  function prepareWhenDuplicate(serverResult) {
    disableApplyButtonIfSpecNoLongerExists(serverResult);
    serverResult.id = 0;
    var originalExperiment = serverResult;
    experimentFormService.initDuplicate(originalExperiment, function (formData) {
      self.newExperiment = formData.uiExperiment;
      self.form = formData.form;
      setExposureForCurrentSpecAndProduct();
      removeLinkedIdWhenLinkedExperimentNotActive();
      initSelectMultiInFormService();

      var theSpec =  MetaData.getSpec(self.form.scopesmap, originalExperiment.scope, originalExperiment.key);
      self.newExperiment.key.value = theSpec.key; //in case spec name case was change (exp to lower), the current ket should be applyied, in order to enable the name in the controller
      self.newExperiment.groups.value = angular.copy(originalExperiment.groups);
      if (configData.isPublicScope(self.newExperiment.scope.value)) {
        self.newExperiment.isPublicScope = true;
        if (isExperimentOnSpec(theSpec.key, self.newExperiment.scope.value)) {
          self.addAlert('experimentOnSpecAlert', theSpec.key);
        }
      }

      self.enableAddTestGroup =  (theSpec.groups.length === 0);
      self.filters = specFilters(self.form.scopesmap);

      if (self.enableAddTestGroup) {
        _.each(self.newExperiment.groups.value, function (group) {
          group.userTestGroup = true;
        });
        _.each(self.newExperiment.groups.origin, function (group) {
          group.userTestGroup = true;
        });
      }

      $timeout(function () {
        $timeout(function () {
          self.initFormOnNew();
          self.filters.calculate(self.newExperiment);
          self.dataLoading = false;
        }, 0);
      }, 0);
    }, function (error) {

      if (error === undefined) {
        error = {text: MetaData.Config.invalidSpec};
      }
      modalHelper.modalInstance('views/confirm.html',
        'modalController',
        'confirm-dialog',
        {content: function () {
          return {
            header: 'Sorry',
            body: error.text,
            okText: MetaData.Config.invalidSpecConfirmButton,
            cancelText: MetaData.Config.invalidSpecCancelButton,
            data: null
          };
        }},
        function () {
          self.exitScope();
        },
        function () {

        }
      );
    });
  }

  var prepareWhenEdit = function (serverResult) {
    disableApplyButtonIfSpecNoLongerExists(serverResult);

    var formData = experimentFormService.init(serverResult);
    self.originalExperiment = angular.copy(formData.uiExperiment);
    self.newExperiment = angular.copy(formData.uiExperiment);
    self.form = formData.form;
    setExposureForCurrentSpecAndProduct();
    self.header = 'Edit Experiment ' + self.newExperiment.name.value + ' (' + self.newExperiment.id + ')';
    if (!self.newExperiment.editable) {
      if (configData.isDealerScope(self.newExperiment.scope.value)) {
        self.alerts = alertsService.addAlert('experimentNotEditableScope', self.newExperiment.name.value, self.newExperiment.scope.value);
      } else {
        self.alerts = alertsService.addAlert('experimentNotEditable', self.newExperiment.name.value, self.newExperiment.key.value);
      }
    }

    self.filters = specFilters(self.form.scopesmap);

    initSelectMultiInFormService();

    //the line a headself.newExperiment 'assumes' that spec test group is non-changeable, once an experiment was instanciated.
    self.datepicker = {date: new Date()};
    self.minDateFrom = new Date();
    self.minDateTo = tmService.yearFrom(self.minDateFrom);
    $timeout(function () {
      self.initFormOnEdit();
      self.filters.calculate(self.newExperiment);
      self.dataLoading = false;
    }, 0);
  };

  self.applyButtonText = 'Create Experiment';
  self.cancelButtonText = 'Cancel';

  MetaData.initExposures()
    .$promise.then(function () {
      self.allExposures = MetaData.exposures;
    });
  MetaData.initScopeMap()
    .$promise.then(function () {
      if (allExperiments.op === 'duplicate') {
        //this is the skeleton
        self.header = 'Duplicate Experiment';
        self.applyDisabled = false;
        self.form = self.newExperiment = Experiment.restApi.get({experimentId: allExperiments.id}, prepareWhenDuplicate, function (response) {
          $log.error(response);
          $rootScope.msg = MetaData.Config.restApiDuplicateFailed;
        });

      }  else if (allExperiments.op === 'new') {
        self.header = 'Add Experiment';
        self.applyDisabled = false;
        self.form = self.newExperiment = Experiment.restExperimentSkeleton.get(prepare, function (response) {
          $log.error(response);
          $rootScope.msg = MetaData.Config.restApiGetExperimentFailed;
        });

      } else if (allExperiments.op === 'edit') {
        self.applyDisabled =  true;
        self.form =
          self.newExperiment =
            Experiment.restApi.get({experimentId: allExperiments.id}, prepareWhenEdit, function (error) {
              $rootScope.msg = MetaData.Config.restApiGetExperimentFailed;
              $log.error('error : ', error);
              self.exitScope();
            });
      }
    });
  self.editInServer = function () {
    self.newExperiment.comment.value = self.comment.value;
    Experiment.restApi.update({experimentId: allExperiments.id}, experimentFormService.toExperiment(self.newExperiment), function () {
      $rootScope.msg = MetaData.Config.restApiUpdateSuccess;
      $rootScope.msg.text = $rootScope.msg.text.replace('__id__', self.newExperiment.id);
      //TODO : replace event string with enum  !!!
      $rootScope.$broadcast('editExperiment');
    }, function (error) {
      $rootScope.msg = MetaData.Config.restApiUpdateFailed;
      $log.error('error : ', error);
    });
  };

  self.prepareToUpdateExposure = function () {
    self.exposureIdForServer = self.exposureObj.id;
    self.exposureStatus = 'update';
  };

  self.updateExposureInServer = function (experiment, exposureIdForServer) {
    ExposureId.post(experiment.isPublicScope ? experiment.key.value2 : experiment.key.value, exposureIdForServer)
      .then(function () {
        changeExposureObjToBeWithExposureId(exposureIdForServer);
        self.exposureStatus = undefined;
      }, function () {
        self.exposureStatus = 'error';
      });
  };

  self.closeExposureIdUpdateStatusMessage = function () {
    self.exposureStatus = undefined;
  };

  self.create = function () {

    Experiments.restApi.create(experimentFormService.toExperiment(self.newExperiment), function () {
      $rootScope.msg =  MetaData.Config.restApiNewSucceeded;
      $rootScope.$broadcast('newExperiment');
    }, function (error) {
      $rootScope.msg = MetaData.Config.restApiNewFailed;
      $log.error('error : ', error);
    });
  };

  self.exitScope = function () {
    try {
      $modalInstance.dismiss(false);
    } catch (err) {
      $log.info(err);
    }
  };

  self.close = function () {
    self.exitScope();
  };

  self.alerts = [];

  self.addAlert = function (name, param1, param2, param3) {
    alertsService.removeAll();
    alertsService.addAlert(name, param1, param2, param3);
    self.alerts = alertsService.alerts;
  };

  self.removeAlert = function (name) {
    alertsService.removeAlert(name);
    self.alerts = alertsService.alerts;
  };
  self.closeAlert = function (index) {
    alertsService.removeAlert(self.alerts[index].name);
    self.alerts = alertsService.alerts;
  };

  var isExperimentOnSpec = function (spec, scope) {
    var nonTerminated = _.filter(allExperiments.allexperiments, function (e) {
      return e.state !== ExperimentDataType.experimentState.StateEnded;
    });
    return _.where(nonTerminated, {key: spec, scope: scope}).length > 0;
  };

  $scope.$watch('newExpCtrl.newExperiment', function (newValue) {
    if (self.dataLoading) {
      return;
    }
    if (newValue === undefined) {
      return;
    }

    $log.info('expeiment changed');

    if (allExperiments.op === 'edit') {
      var res = experimentFormService.experimentDiff(self.originalExperiment, self.newExperiment);
      self.applyDisabled = !res.isDiff;

      if (self.newExperiment.description.value !== self.originalExperiment.description.value) {
        self.applyDisabled = false;
      }
    }

    self.form.invalid = !experimentFormService.isValid(self.newExperiment, self.filters);
    experimentFormService.updateSelectMulty($('#geo'), self.newExperiment.geo.value);
    experimentFormService.updateSelectMulty($('#lang'), self.newExperiment.languages.value);
    experimentFormService.updateSelectMulty($('#exclude-user-groups'), self.newExperiment.excludeUserGroups.value);
    experimentFormService.updateSelectMulty($('#include-user-agents'), self.newExperiment.includeUserAgentRegexes.value);
    experimentFormService.updateSelectMulty($('#exclude-user-agents'), self.newExperiment.excludeUserAgentRegexes.value);


  }, true);

  self.scrollToBottom = function () {
    var container = $('#tab0'),
      scrollTo = $('#bottom');

    container.animate({
      scrollTop: scrollTo.offset().top - container.offset().top + container.scrollTop()
    });
  };

  self.removeTestGroup = function (tGroup) {
    self.newExperiment.groups.value = _.without(self.newExperiment.groups.value, tGroup);
    if (self.newExperiment.type.value === 'featureToggle') {
      self.onFeatureToggle();

    } else {
      self.onAbTest();
    }
  };

  self.editTestGroup = function (tGroup, id) {
    if (!tGroup.userTestGroup) {
      return;
    }
    self.editedTgroup =  tGroup;
    tGroup.edit = true;
    $(id).val(tGroup.value);
  };

  self.editTestGroupDone = function (tGroup, id) {
    $log.info('edit done, value = ', $('#' + id).val());
    delete tGroup.edit;
    self.onClickSaveNewTestGroup(tGroup, id);
  };

  self.editTestGroupRevert = function (tGroup, id) {
    $log.info('edit revert, value = ', $('#' + id).val(), ' previuos value : ', _.where(self.newExperiment.groups.origin, {id: tGroup.id})[0].value);
    $('#' + id).val(_.where(self.newExperiment.groups.origin, {id: tGroup.id})[0].value);
    delete tGroup.edit;
    var groupOrigin = _.where(self.newExperiment.groups.origin, {id: tGroup.id})[0];
    tGroup.value = angular.copy(groupOrigin.value);

  };

  function addNewTestGroup() {
    //var id = self.newExperiment.groups.value.length+1; //server id count starts at 1
    var id = self.newExperiment.groups.value.length === 0 ? 1 : (_.max(self.newExperiment.groups.value, function (group) {
      return group.id;
    })).id + 1;
    var groups = self.newExperiment.groups;
    groups.value.push({id: id, value: undefined, chunk: 0, userTestGroup: false});
    groups.origin.push({id: id, value: undefined, chunk: 0, userTestGroup: false});
    return groups.value[groups.value.length - 1];
  }

  self.onClickSaveNewTestGroup = function (tGroup, id) {
    var text = $('#' + id).val().trim();
    var group = _.where(self.newExperiment.groups.value, {id: tGroup.id})[0];
    var groupOrigin = _.where(self.newExperiment.groups.origin, {id: tGroup.id})[0];

    if (text.trim().length === 0) {
      self.newExperiment.groups.value = _.without(self.newExperiment.groups.value, group);
      self.newExperiment.groups.origin = _.without(self.newExperiment.groups.origin, group);
      return;
    }
    group.value = text;
    group.userTestGroup = true;
    groupOrigin.value = text;
    groupOrigin.userTestGroup = true;

    if (self.newExperiment.type.value === 'featureToggle') {
      self.onFeatureToggle();

    } else {
      self.onAbTest();
    }
  };

  self.addNewTestGroup = function () {
    self.editedTgroup = addNewTestGroup();

    $timeout(function () {
      var doOnKeyPress = function (key, elementId) {
        if (key.keyIdentifier === 'Enter') {
          if (key.target.value.trim().length === 0) {
            return;
          }
          $(elementId).css('display', 'none');
          self.onClickSaveNewTestGroup(self.editedTgroup, elementId);
          $scope.$digest();

        }
      };

      var id = self.editedTgroup.id;
      //TODO : move this into angular directive !!!
      $('#testGroup' + id)[0].onkeypress = function (key) {
        doOnKeyPress(key, 'testGroup' + id);
      };

      $('#testGroupFT' + id)[0].onkeypress = function (key) {
        doOnKeyPress(key, 'testGroupFT' + id);
      };

    }, 0);
  };

  self.openfrom = function () {
    $timeout(function () {
      self.form.openedfrom = true;
    });
  };

  self.opento = function () {
    $timeout(function () {
      self.form.openedto = true;
    });
  };

  $rootScope.$on('shouldIdentify', function () {

    self.exitScope();
  });

  self.dateOptions = {
    'year-format': 'yy',
    'starting-day': 1
  };

  self.format =  'dd/MM/yyyy';

}]);

'use strict';

angular.module('uiPetri').controller('historyController', ["$scope", "$rootScope", "Experiments", "spec", "$timeout", "$log", "tmService", "Experiment", "experimentId", "$modal", "$modalInstance", "$filter", function ($scope, $rootScope, Experiments, spec, $timeout, $log, tmService, Experiment, experimentId, $modal, $modalInstance, $filter) {
  $log.log('historyController...');

  $scope.dataLoading = true;

  function editingData(allexperiments) {
    var users = function (experiment) {
      if (experiment.allRegistered) {
        return 'all registered users';
      }
      if (experiment.newRegistered) {
        return 'new registered users';
      }
      if (experiment.nonRegistered) {
        return 'no existing registered users';
      }
      if (experiment.anonymous) {
        return 'first time visitors';
      }
      return 'No filter';
    };

    _.each(allexperiments, function (e) {
      $scope.experimentName = e.name;
      $scope.creator = e.creator;
      $scope.id = experimentId;
      e.info = Experiment.info(e);
      var start = $filter('date')(e.startDate, 'yyyy/MM/dd HH:mm');
      var end = $filter('date')(e.endDate, 'yyyy/MM/dd HH:mm');
      var lastUpdated = $filter('date')(e.lastUpdated, 'yyyy/MM/dd HH:mm');
      var interval = (e.endDate - e.startDate) / 1000 / 60 / 60 / 24;
      e.timeInfo = ['S: ' + start, 'E: ' + end, interval.toFixed(0) + ' days', 'U: ' + lastUpdated];
      if (e.geo.length === 0) {
        e.geo.push('All');
      }
      if (e.languages.length === 0) {
        e.languages.push('All');
      }
      e.filterInfo = [
        {k: 'Wix Employee', v: e.wixUsers ? ' +' : ' -'},
        {k: 'Users', v: users(e)},
        {k: 'Exc Guids', v: e.excludeGuids.length === 0 ? 'None' : e.excludeGuids.toString()},
        {k: 'Inc Guids', v: e.includeGuids.length === 0 ? 'None' : e.includeGuids.toString()},
        {k: 'Inc MetaSiteIds', v: e.metaSiteIds.length === 0 ? 'None' : e.metaSiteIds.toString()},
        {k: 'Exc UserGroups', v: e.excludeUserGroups.length === 0 ? 'None' : e.excludeUserGroups.toString()},
        {k: 'Inc UserAgentRegexes', v: e.includeUserAgentRegexes.length === 0 ? 'None' : e.includeUserAgentRegexes.toString()},
        {k: 'Exc UserAgentRegexes', v: e.excludeUserAgentRegexes.length === 0 ? 'None' : e.excludeUserAgentRegexes.toString()},
        {k: (e.excludeGeo ? 'Exc ' : 'Inc ') + 'Geo', v: e.geo.toString()},
        {k: 'Lang', v: e.languages.toString()},
        {k: 'Hosts', v: e.hosts.toString()},
        {k: 'Conduct Limit', v: e.conductLimit}
      ];
    });
  }

  $scope.history = Experiment.restExperimentHistory.query({experimentId: experimentId}, function (res) {
    $scope.history = res;
    editingData($scope.history);
    $scope.dataLoading = false;
  }, function () {
  });

  $scope.exitScope = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.cancel = function () {
    $scope.exitScope();
  };
}]);

'use strict';

angular.module('uiPetri')
  .constant(
  'PULL_EDIT_STATUS_INTERVAL', 2 * 60 * 1000)
  .controller('allExperiments', ["$scope", "Experiments", "gridService", "$filter", "$timeout", "$rootScope", "$log", "$stateParams", "_", "ExperimentDataType", "EditStatus", "Experiment", "MetaData", "modalHelper", "$interval", "PULL_EDIT_STATUS_INTERVAL", "removeSpec", function ($scope, Experiments, gridService, $filter, $timeout, $rootScope, $log,
                                          $stateParams, _, ExperimentDataType, EditStatus, Experiment, MetaData, modalHelper, $interval, PULL_EDIT_STATUS_INTERVAL, removeSpec) {
    MetaData.init();

    $scope.dataLoading = true;
    $scope.class = $stateParams.state;

    $scope.editStatus = true;
    function isLeftToRightMark(str, i) {
      return str.charCodeAt(i) === 8206;
    }

    function removeUnwantedChars(str) {
      for (var i = 0; i < str.length; i++) {
        if (isLeftToRightMark(str, i)) { // remove &lrm;
          str = str.substr(0, i) + str.substr(i + 1);
        }
      }
      return str;
    }

    function getEditStatus() {

      EditStatus.get()
        .then(function (response) {
          $scope.editStatus = response;
        });
    }

    $scope.cancelInterval = function () {      // Make sure that the interval is destroyed too
      if (angular.isDefined($scope.stop)) {
        $interval.cancel($scope.stop);
        $scope.stop = undefined;
      }
    };

    $scope.cancelInterval();

    $scope.successcallbackFromAction = function () {
      $rootScope.msg = MetaData.Config.restApiUpdateNoIdSuccess;
      refresh();
    };
    $scope.failcallbackFromAction = function (error) {
      $rootScope.msg = MetaData.Config.restApiUpdateFailed;
      $log.error('error : ', error);
    };

    $scope.pause =  function (experiment) {
      if (!experiment.editable) {
        return;
      }

      var body = angular.copy(MetaData.Config.pauseTestConfirm);
      body.text = body.text.replace('__exp__', experiment.name);
      $scope.resolve = {
        header: 'Wait!',
        body: body,
        okText: MetaData.Config.pauseConfirmButton,
        cancelText: MetaData.Config.pauseCancelButton,
        data: ''
      };
      modalHelper.modalInstance('views/confirm.html',
        'modalController',
        'confirm-dialog',
        {content: function () {
          return $scope.resolve;
        }},
        function () {
          Experiment.pause(experiment.id, $scope.resolve.data, $scope.successcallbackFromAction, $scope.failcallbackFromAction);
        },
        function () {}
      );
    };

    $scope.terminate =  function (experiment) {
      if (!experiment.editable) {
        return;
      }
      var body = angular.copy(MetaData.Config.stopTestConfirm);
      body.text =  body.text.replace('__exp__', experiment.name);
      $scope.resolve = {
        header: 'Wait!',
        body: body,
        okText: MetaData.Config.stopConfirmButton,
        cancelText: MetaData.Config.stopCancelButton,
        data: ''
      };
      modalHelper.modalInstance('views/confirm.html',
        'modalController',
        'confirm-dialog',
        {content: function () {
          return $scope.resolve;
        }},
        function () {
          Experiment.stop(experiment.id, $scope.resolve.data, function (payload) {
            if (payload.specCanBeDeleted) {
              $scope.deleteSpec(payload);
            }
            $scope.successcallbackFromAction();
          }, $scope.failcallbackFromAction);
        },
        function () {});
    };

    $scope.deleteSpec =  function (data) {
      var body = {
        specCanBeDeleted: data.specCanBeDeleted,
        specKey: data.specKey,
        text: data.specKey + ' will be removed'
      };
      $scope.resolve = {
        header: 'Spec Deletion',
        body: body,
        okText: MetaData.Config.terminateSpecConfirmButton,
        cancelText: MetaData.Config.terminateSpecCancelButton,
        data: null
      };
      modalHelper.modalInstance('views/confirm.html',
        'modalController',
        'confirm-dialog',
        {content: function () {
          return $scope.resolve;
        }},
        function () {
          removeSpec.remove(body.specKey, function () {
            $rootScope.msg = MetaData.Config.terminateSpecSuccess;
          }, function (error) {
            $rootScope.msg = MetaData.Config.terminateSpecFailed;
            $log.error('error : ', error);
          });
        },
        function () {});
    };

    $scope.resume =  function (experiment) {

      var body = angular.copy(MetaData.Config.resumeTestConfirm);
      body.text =  body.text.replace('__exp__', experiment.name);
      $scope.resolve = {
        header: 'Wait!',
        body: body,
        okText: MetaData.Config.resumeConfirmButton,
        cancelText: MetaData.Config.resumeCancelButton,
        data: ''
      };
      modalHelper.modalInstance('views/confirm.html',
        'modalController',
        'confirm-dialog',
        {content: function () {
          return $scope.resolve;
        }},
        function () {
          Experiment.resume(experiment.id, $scope.resolve.data, $scope.successcallbackFromAction, $scope.failcallbackFromAction);
        },
        function () {}
      );
    };

    $scope.duplicate = function (experiment) {
      var resolve = {
        allExperiments: function () {
          return {op: 'duplicate', id: experiment.id, allexperiments: $scope.allexperiments};
        }
      };
      modalHelper.modalInstance('views/experiment.html', 'newExperimentController as newExpCtrl', 'experiment-dialog', resolve);
    };

    $scope.edit = function (experiment) {

      var resolve = {
        allExperiments: function () {
          return {op: 'edit', id: experiment.id, allexperiments: undefined};
        }
      };

      modalHelper.modalInstance('views/experiment.html', 'newExperimentController as newExpCtrl', 'experiment-dialog', resolve);
    };

    $scope.newExperiment = function () {
      var resolve = {
        allExperiments: function () {
          return {op: 'new', id: undefined, allexperiments: $scope.allexperimentsConst};
        }
      };
      modalHelper.modalInstance('views/experiment.html', 'newExperimentController as newExpCtrl', 'experiment-dialog', resolve);
    };

    $scope.history = function (experiment) {
      var resolve = {
        experimentId: function () {
          return experiment.id;
        }
      };
      modalHelper.modalInstance('views/history.html', 'historyController', 'history-dialog', resolve);
    };

    $scope.override = function (experiment) {
      $log.info('overide clicked ', 'info' + experiment.id);
      $scope.overideParams(experiment.info);
    };

    $scope.reports = function (experiment) {
      $log.info('reports clicked ', 'info' + experiment.id);
      $scope.reportsParams(experiment.info, experiment.originalId);
    };

    $scope.reportMetric = function (experiment) {
      $log.info('report metric clicked ', 'info' + experiment.id);
      $scope.reportMetricParams(experiment.info, experiment.originalId);
    };

    $log.debug('state params : ', $stateParams);
    $rootScope.optional = 'col-md-12';
    $scope.selected  = {text: gridService.selected};

    function partialData(allexperiments) {
      _.each(allexperiments, function (e) {
        e.info = Experiment.info(e);
        e.actions = ExperimentDataType.actions.getActionsByState(e.id, e.state);
        e.infoInText = getInfoInString(e.info.lines);
        e.dateInText = getDateInString(e);
        e.contributorsInText = getContributorsInText(e);
      });
      if ($stateParams.state === 'all') {
        return allexperiments;
      }
      return _.where(allexperiments, {state: ExperimentDataType.experimentState.type($stateParams.state)});
    }

    //controller main data
    function refresh() {

      Experiments.restApi.query(function (res) {
        $scope.dataLoading = false;
        $scope.allexperimentsConst = res;
        $rootScope.count = res.length;
        $scope.allexperiments =  res;
        $scope.allexperiments = partialData($scope.allexperiments, $stateParams.state);

        $scope.columnDefs = [];
        $scope.stateCol.visible = $stateParams.state === 'all' ? true : false;
        _.each($scope.columnDefsReset, function (col) {
          $scope.columnDefs.push(col);
        });

      }, function (response) {
        $log.error(response, 'failed to fetch experiments list');
      });
    }

    $scope.execute = function (id, action) {
      var experiment = _.where($scope.allexperiments, {id: id});
      $log.info('execute ', action.op, 'on experiment :', id);
      $scope[action.op](experiment[0]);
    };

    //grid
    $scope.toName = ExperimentDataType.experimentTypeSymbol;

    $scope.notEditable = function (id, action) {
      var experiment = _.where($scope.allexperiments, {id: id});
      var disabled = '';
      if (!$scope.editStatus) {
        switch (action) {
          case ExperimentDataType.actions.terminate :
            disabled = 'disabled';
            break;
          case ExperimentDataType.actions.pause :
            disabled = 'disabled';
            break;
          case ExperimentDataType.actions.edit :
            disabled = 'disabled';
            break;
          case ExperimentDataType.actions.duplicate :
            disabled = 'disabled';
            break;
          case ExperimentDataType.actions.resume :
            disabled = 'disabled';
            break;
          case ExperimentDataType.actions.override :
            disabled = 'disabled';
            break;
        }
      }
      if (!experiment[0].editable) {
        switch (action) {
          case ExperimentDataType.actions.terminate :
            disabled = 'disabled';
            break;
          case ExperimentDataType.actions.pause :
            disabled = 'disabled';
            break;
        }
      }
      return disabled;
    };

    $scope.icon = function (action, id) {

      var experiment = _.where($scope.allexperiments, {id: id});
      switch (action.op) {
        case ExperimentDataType.actions.duplicate.op :
          return 'fa fa-copy fa-fw';
        case ExperimentDataType.actions.resume.op :
          return 'fa fa-play fa-fw';
        case ExperimentDataType.actions.terminate.op :
          return 'fa fa-stop fa-fw';
        case ExperimentDataType.actions.pause.op :
          return 'fa fa-pause fa-fw';
        case ExperimentDataType.actions.edit.op :
          return experiment[0].editable ? 'fa fa-pencil fa-fw' : 'fa fa-eye fa-fw';

        case ExperimentDataType.actions.history.op :
          return 'fa fa-clock-o fa-fw';
        case ExperimentDataType.actions.reports.op :
          return 'fa fa-file-text-o fa-fw';
        case ExperimentDataType.actions.reportMetric.op :
          return 'fa fa-book fa-fw';
        case ExperimentDataType.actions.override.op :
          return 'fa fa-cogs fa-fw';
      }
    };

    $scope.overideParams = function (info) {
      $log.info('info clicked ', 'info' + info.id);

      modalHelper.modalInstance('views/overide.html',
        'modalController',
        'overide-dialog',
        {content: function () {
          return {
            header: 'Override Parameters',
            body: info,
            okText: {text: 'ok'},
            cancelText: {text: 'ok', class: 'ng-hide'}
          };
        }}
      );
    };

    $scope.reportsParams = function (info, originalId) {
      $log.info('reports clicked ', 'reports' + info.id);

      modalHelper.modalInstance('views/reports.html',
        'modalController',
        'overide-dialog',
        {content: function () {
          return {
            header: 'Jira Reports',
            body: info,
            origId: originalId,
            okText: {text: 'ok'}
          };
        }}
      );
    };

    $scope.reportMetricParams = function (info, originalId) {
      $log.info('report metric clicked ', 'reports' + info.id);

      modalHelper.modalInstance('views/reportMetric.html',
        'modalController',
        'overide-dialog',
        {content: function () {
          return {
            header: 'Experiment Conduct Report',
            body: info,
            origId: originalId,
            okText: {text: 'ok'}
          };
        }}
      );
    };

    $scope.infoTableToolTip = function (json) {
      return _.object(_.pluck(json, 'value'), _.pluck(json, 'chunk'));
    };
    $scope.infoTitle = function (lines) {
      return _.zip(_.pluck(lines, 'value'), _.pluck(lines, 'chunk'));

    };

    function getInfoInString(lines) {
      var str = '';
      lines.forEach(function (line) {
        str += ' ' + line.value;
      });
      return str;
    }

    var getDateInDisplayFormat = function (date) {
      return date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    };

    function getContributorsInText(experiment) {
      return experiment.creator + ' ' + experiment.updater;
    }

    function getDateInString(experiment) {
      var lastUpdated = new Date(experiment.lastUpdated);
      var startDate = new Date(experiment.startDate);
      lastUpdated = getDateInDisplayFormat(lastUpdated);
      startDate = getDateInDisplayFormat(startDate);
      return lastUpdated + ' ' + startDate;
    }
    var infoTable = '<div class="ngCellTable" style="padding-left:5px;padding-top: 5px" id="{{\'info\'+row.getProperty(col.field).id}}"><table style="margin-left: 0px; min-width: 100%">' +
      '<tr ng-repeat="line in row.getProperty(col.field).lines">' +
      '<td popover="value:{{line.value}}  BI-title:{{line.id}}0000{{line.idValue}}" popover-trigger="mouseenter" popover-placement="right" popover-append-to-body="true" class="ngCellText1" style="color:rgba(9, 140, 163, 0.98);font-weight:bold;text-align: left;max-width: 50px">' +
      '{{line.value}}:' +
      '</td>' +
      '<td popover="{{line.chunk}}%" popover-trigger="mouseenter" popover-placement="right" popover-append-to-body="true">' +
      '{{line.chunk}}%' +
      '</td>' +
      '<td popover="{{line.idValue}}%" popover-trigger="mouseenter" popover-placement="right" popover-append-to-body="true">' +
      '#{{line.idValue}}' +
      '</td>' +
      '</tr>' +
      '</table></div>';

    var genInfoColTable = '<div class=" ngCellTable" style="padding-left:5px;padding-top: 5px;" id="{{\'info\'+row.getProperty(col.field).id}}" ><table>' +
      '<tr povover="scope:{{row.entity.scop}} id:{{row.entity.id}} type:{{row.entity.type}}" popover-trigger="mouseenter" popover-placement="right" ><td class="ngCellText1" style="font-weight:bold";>{{row.entity.scope }}</td></tr>' +
      '<tr><td style="font-size: smaller;text-align: center"><span style="padding-right:5px;color:rgba(9, 140, 163, 0.98);font-weight:bold">id:{{row.entity.id}}</span>{{toName(row.entity.type) }}</td></tr>' +
      '</table></div>';

    var nameKeyColTable = '<div class="ngCellTable" style="padding-left:5px;padding-top: 5px;" id="{{\'info\'+row.getProperty(col.field).id}}" ><table>' +
      '<tr popover="name:{{row.entity.name}}" popover-trigger="mouseenter" popover-placement="right" popover-append-to-body="true">' +
      '<td  class="ngCellText1" style="font-weight:bold;">{{row.entity.name}}</td></tr>' +
      '<tr popover="key: {{row.entity.key}}" popover-trigger="mouseenter" popover-placement="right" popover-append-to-body="true"><td style="text-align:center;">{{row.entity.key}}<td/></tr>' +
      '</table></div>';

    var dateTable = '<div class="ngCellText ngCellTable" style="padding-left:5px;padding-top: 5px;" id="{{\'info\'+row.getProperty(col.field).id}}" popover="Dates: start : {{row.entity.startDate | date:\'dd-MM-yy HH:mm\'}}, modified : {{row.entity.lastUpdated | date:\'dd-MM-yy HH:mm\'}}, end : {{row.entity.endDate | date:\'dd-MM-yy HH:mm\'}}" popover-trigger="mouseenter" popover-placement="left" popover-append-to-body="true"><table>' +
      '<tr><td style="color:rgba(9, 140, 163, 0.98);font-weight:bold">s:</td><td>{{row.getProperty(col.field) | date:\'dd-MM-yy HH:mm\'}}</td></tr >' +
      '<tr><td style="color:rgba(9, 140, 163, 0.98);font-weight:bold">m:</td><td>{{row.entity.lastUpdated | date:\'dd-MM-yy HH:mm\'}}</td></tr>' +
      '<tr><td style="color:rgba(9, 140, 163, 0.98);font-weight:bold">e:</td><td>{{row.entity.endDate | date:\'dd-MM-yy HH:mm\'}}</td></tr>' +
      '</table></div>';

    var ownersTable = '<div class=" ngCellTable" style="padding-left:5px;padding-top: 5px" id="{{\'info\'+row.getProperty(col.field).id}}"><table>' +
      '<tr popover="creator: {{row.entity.creator}}" popover-trigger="mouseenter" popover-placement="left" popover-append-to-body="true"><td style="color:rgba(9, 140, 163, 0.98);font-weight:bold">o:</td><td class="ngCellText2">{{row.entity.creator | mail2name }}</td></tr >' +
      '<tr popover="updater: {{row.entity.updater}}" popover-trigger="mouseenter" popover-placement="left" popover-append-to-body="true"><td style="color:rgba(9, 140, 163, 0.98);font-weight:bold">u:</td><td class="ngCellText2">{{row.entity.updater | mail2name }}</td></tr>' +
      '</table></div>';

    var descriptionCell = '<div class="ngCellTable" style="padding-left:5px;padding-top: 5px;"><table style="margin-left: 0px;"><tr><td class="ngCellText1 ngCellText3" popover="{{row.getProperty(col.field)}}" popover-trigger="mouseenter" popover-placement="right" popover-append-to-body="true" >{{row.getProperty(col.field)}}</td></tr></table></div>';

    var actionMenu = '<div class="dropdown">' +
      '<a class="dropdown-toggle" style="background-color:inherit;border: none" ><i class="fa fa-cog fa-2x actionCell" />' +
      '</a>' +
      '<ul class="dropdown-menu actions">' +
      '<li ng-repeat=\'action in row.getProperty(col.field).actions\' ng-class="notEditable(row.getProperty(col.field).id,action)" <a ng-click="execute(row.getProperty(col.field).id,action)" ><i ng-class="icon(action,row.getProperty(col.field).id)" ></i>{{\' \'+action.text}}</a>' +
      '</li>' +
      '</ul>' +
      '</div>';

    /*
     DoubleClick row plugin
     */
    function ngGridDoubleClick() {
      /*jshint validthis: true */
      var self = this;
      self.$scope = null;
      self.myGrid = null;

      self.init = function (scope, grid) {

        self.$scope = scope;
        self.myGrid = grid;
        self.assignEvents();
      };
      self.assignEvents = function () {
        self.myGrid.$viewport.on('dblclick', self.onDoubleClick);
      };
      // double-click function
      self.onDoubleClick = function () {
        if (!$scope.editStatus) {
          return;
        }
        if (!self.$scope.selectedItems[0].editable) {
          return;
        }
        if (self.$scope.selectedItems[0].state === 'ended') {
          return;
        }
        self.myGrid.config.dblClickFn(self.$scope.selectedItems[0]);
      };
    }

    $scope.stateCol = {
      field: 'state',
      displayName: 'State',
      width: 30,
      visible: false,
      cellTemplate: '<div class="actionCell fa fa-fw" ng-class=\'{"fa-pause":row.getProperty(col.field)=="paused","fa-stop":row.getProperty(col.field)=="ended","fa-play":row.getProperty(col.field)=="active","fa-forward":row.getProperty(col.field)=="future"} \' style="cursor: text;color:rgba(191, 211, 214, 0.98)"}></div>'
    };

    $scope.columnDefs =
      $scope.columnDefsReset =   [
        {field: 'id',     displayName: 'Id', visible: false},
        {field: 'creationDate',     displayName: 'CreationDate', visible: false},
        $scope.stateCol,
        {field: 'name',     displayName: 'Name', visible: false, cellTemplate: '<div class="ngCellText" popover="{{row.getProperty(col.field)}}" popover-trigger="mouseenter" popover-placement="right" popover-append-to-body="true" style="color: rgba(9, 140, 163, 0.98);font-weight:bold;cursor: text;">{{row.getProperty(col.field)}}</div>'},
        {field: 'key',       displayName: 'Exp. Key', visible: false, cellTemplate: '<div class="ngCellText" popover="{{row.getProperty(col.field)}}" popover-trigger="mouseenter" popover-placement="right" popover-append-to-body="true" style="color: rgba(9, 140, 163, 0.98);font-weight:bold;cursor: text;">{{row.getProperty(col.field)}}</div>'},
        {field: 'name_key', displayName: 'Name/ Key', cellTemplate: nameKeyColTable},
        {field: 'scope_type_id', displayName: 'Product /id/ Type', cellTemplate: genInfoColTable, width: 120},
        {field: 'type',     displayName: 'Type', visible: false, cellTemplate: '<div class="ngCellText" style="cursor: text;">{{toName(row.getProperty(col.field))}}</div>'},
        {field: 'info',     displayName: 'Info', visible: true, cellTemplate: infoTable, width: 120},
        {field: 'infoInText', visible: false},
        {field: 'description',     displayName: 'Description', cellTemplate: descriptionCell},
        {field: 'startDate', displayName: 'Date', cellTemplate: dateTable, width: 120},
        {field: 'dateInText', visible: false},
        {field: 'creator_updater',     displayName: 'Contributors', cellTemplate: ownersTable, width: 70},
        {field: 'creator',     displayName: 'Creator', visible: false},
        {field: 'updater',     displayName: 'Updater', visible: false},
        {field: 'scope',     displayName: 'Product', visible: false},
        {field: 'actions',   displayName: '', cellTemplate: actionMenu, width: 45}
      ];


    $scope.$watch('login', function (value) {
      if (value === undefined) {
        return;
      }
      $scope.cancelInterval();
      $scope.show = value.login;
      $log.info('show : ', $scope.show);

      if ($scope.show) {
        getEditStatus();
        $scope.stop = $interval(getEditStatus, PULL_EDIT_STATUS_INTERVAL);
        $timeout(function () {
          refresh();
          $scope.$digest();
        }, 0);
      }
    });

    $scope.gridOptions  =  {
      enableHighlighting: true,
      data: 'allexperiments',
      rowHeight: 65,
      enableColumnResize: true,
      rowTemplate: '<div style="height: 100%" ng-class="col.colIndex()"><div ng-style="{ \'cursor\': row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell ">' +
        '<div class="ngVerticalBar" ng-style="{height: rowHeight}" > </div>' +
        '<div ng-cell></div>' +
        '</div></div>',
      columnDefs: 'columnDefs',
      //groups: ['state'],
      dblClickFn: $scope.edit,
      plugins: [ngGridDoubleClick],
      filterOptions: { filterText: '', useExternalFilter: false },
      groupsCollapsedByDefault: false,
      selectedItems: $scope.mySelections,
      multiSelect: false,
      showFilter: false,
      maintainColumnRatios: false,
      showFooter: false,
      sortInfo: {fields: ['creationDate'], directions: ['desc'] },

      afterSelectionChange: function () {
        gridService.setSelected($scope.mySelections);
      }
    };

    $scope.gridOptions.filterOptions.filterText = gridService.selected;
    $scope.onSelectedChange = function () {
      $scope.selected.text = removeUnwantedChars($scope.selected.text);
      $scope.gridOptions.filterOptions.filterText = $scope.selected.text;
      gridService.selected = $scope.selected.text;
    };

    $rootScope.$on('newExperiment', function () {
      refresh();
    });

    $rootScope.$on('editExperiment', function () {
      refresh();
    });

    $scope.$on('$destroy', function () {
      $scope.cancelInterval();
    });
  }]);

'use strict';

angular.module('uiPetri')
  .controller('allSpecs', ["$scope", "Specs", "gridService", "$filter", "$timeout", "$rootScope", "$log", "$stateParams", "_", "modalHelper", "MetaData", "removeSpec", function ($scope, Specs, gridService, $filter, $timeout, $rootScope, $log, $stateParams, _, modalHelper, MetaData, removeSpec) {
    $scope.dataLoading = true;
    $scope.class = $stateParams.state;

    $scope.selected  = {text: gridService.selected};

    var actionMenu = '<div class="dropdown">' +
      '<a class="dropdown-toggle" style="background-color:inherit;border: none" ><i class="fa fa-cog fa-2x actionCell" />' +
      '</a>' +
      '<ul class="dropdown-menu actions">' +
      '<li ng-class="{\'disabled\': !row.entity.canBeDeleted, \'spec-delete-disabled\': !row.entity.canBeDeleted}" <a ng-click="deleteSpec(row.entity)">' +
      '<i class="fa fa-trash-o"></i> Delete</a>' +
      '</li>' +
      '</ul>' +
      '</div>';

    function partialData(allSpecs) {
      _.each(allSpecs, function (e) {
        e.scopes = e.scopes.toString();
        e.testGroups = e.testGroups.toString();
      });
      return allSpecs;
    }

    //controller main data
    function refresh() {

      Specs.restApi.query(function (res) {
        $scope.dataLoading = false;
        $scope.allSpecsConst = res;
        $rootScope.count = res.length;
        $scope.allSpecs =  res;
        $scope.allSpecs = partialData($scope.allSpecs);

        $scope.columnDefs = [];
        _.each($scope.columnDefsReset, function (col) {
          $scope.columnDefs.push(col);
        });

      }, function (response) {
        $log.error(response, 'failed to fetch specs list');
      });
    }

    $scope.columnDefs =
      $scope.columnDefsReset =   [
        {field: 'key',       displayName: 'Key', visible: true},
        {field: 'lastUpdateDate', displayName: 'Updated At..', cellTemplate: '<div class="ngCellText" style="cursor: text;">{{row.getProperty(col.field)| date:\'yyyy-MM-dd HH:mm\'}}</div>'/*cellFilter:'date:"yyyy-MM-dd HH:mm"'*/},
        {field: 'testGroups',     displayName: 'Test Groups', visible: true, cellTemplate: '<div class="ngCellText" style="word-wrap: word-break;" title="{{row.getProperty(col.field)}}">{{row.getProperty(col.field)}}</div>'},
        {field: 'scopes',     displayName: 'Products', visible: true, cellTemplate: '<div class="ngCellText" style="word-wrap: word-break;" title="{{row.getProperty(col.field)}}">{{row.getProperty(col.field)}}</div>'},
        {field: 'owner',       displayName: 'Owner', visible: true},
        {field: 'creationDate', displayName: 'Created At..', cellTemplate: '<div class="ngCellText" style="cursor: text;">{{row.getProperty(col.field)| date:\'yyyy-MM-dd HH:mm\'}}</div>'/*cellFilter:'date:"yyyy-MM-dd HH:mm"'*/},
        {field: 'persistent',       displayName: 'Is Persistent', visible: true},
        {field: 'actions',   displayName: '', cellTemplate: actionMenu, width: 45}

      ];

    $scope.$watch('login', function (value) {
      if (value === undefined) {
        return;
      }
      $scope.show = value.login;
      $log.info('show : ', $scope.show);

      if ($scope.show) {
        $timeout(function () {
          refresh();
          $scope.$digest();
        }, 0);
      }
    });

    $scope.gridOptions  =  {
      enableHighlighting: true,
      data: 'allSpecs',
      rowHeight: 55,
      enableColumnResize: true,
      rowTemplate: '<div style="height: 100%" ng-class="col.colIndex()"><div ng-style="{ \'cursor\': row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell ">' +
      '<div class="ngVerticalBar" ng-style="{height: rowHeight}" > </div>' +
      '<div ng-cell></div>' +
      '</div></div>',
      columnDefs: 'columnDefs',
      //groups:['state'],
      filterOptions: { filterText: '', useExternalFilter: false },
      groupsCollapsedByDefault: false,
      selectedItems: $scope.mySelections,
      multiSelect: false,
      showFilter: false,
      maintainColumnRatios: false,
      showFooter: false,
      sortInfo: {fields: ['id'], directions: ['asc'] },

      afterSelectionChange: function () {
        gridService.setSelected($scope.mySelections);
      }
    };

    $scope.deleteSpec = function (spec) {
      var body = {
        spec: spec,
        text: spec.key + ' will be removed'
      };
      var resolve = {
        content: function () {
          return {
            header: 'Spec Deletion',
            body: body,
            okText: MetaData.Config.terminateSpecConfirmButton,
            cancelText: MetaData.Config.terminateSpecCancelButton,
            data: null
          };
        }
      };

      modalHelper.modalInstance('views/confirm.html', 'modalController', 'confirm-dialog', resolve, function () {
        removeSpec.remove(body.spec.key, function () {
          $rootScope.msg = MetaData.Config.terminateSpecSuccess;
          refresh();
        }, function (error) {
          $rootScope.msg = MetaData.Config.terminateSpecFailed;
          $log.error('error : ', error);
        });
      });
    };

    $scope.gridOptions.filterOptions.filterText = gridService.selected;
    $scope.onSelectedChange = function () {
      $scope.gridOptions.filterOptions.filterText = $scope.selected.text;
      gridService.selected = $scope.selected.text;

    };
  }]);

'use strict';

angular.module('uiPetri')
  .controller('experimentView', ["$scope", "$timeout", "$rootScope", "$log", "Experiment", "MetaData", "$stateParams", "experimentFormService", "$filter", function ($scope, $timeout, $rootScope, $log, Experiment, MetaData, $stateParams, experimentFormService, $filter) {
    $scope.dataLoading = true;
    $scope.experimentId = $stateParams.experimentId;
    $scope.class = $stateParams.state === '' ? 'general' : $stateParams.state;

    MetaData.initSynch(function () {
      Experiment.restApi.get($stateParams, function (serverResult) {

        $scope.experiment = serverResult;
        if (serverResult === null) {
          $timeout(function () {
            $scope.dataLoading = false;
          }, 0);
          return;
        }
        $scope.info = Experiment.info($scope.experiment);
        $scope.experiment.startDate = $filter('date')(new Date($scope.experiment.startDate), 'yyyy-MM-dd HH:mm:ss');
        $scope.experiment.endDate = $filter('date')(new Date($scope.experiment.endDate), 'yyyy-MM-dd HH:mm:ss');
        $scope.experiment.creationDate = $filter('date')(new Date($scope.experiment.creationDate), 'yyyy-MM-dd HH:mm:ss');
        $scope.experiment.lastUpdated = $filter('date')(new Date($scope.experiment.lastUpdated), 'yyyy-MM-dd HH:mm:ss');
        $scope.experiment.enablingEsperimentStartDate = $filter('date')(new Date($scope.experiment.parentStartTime), 'yyyy-MM-dd HH:mm:ss');
        $scope.experiment.geo = _.pluck(experimentFormService.collectionForEditting(MetaData.restApi.geo, $scope.experiment.geo), 'text').toString();
        $scope.experiment.excludeUserGroups = _.pluck(experimentFormService.collectionForEditting(MetaData.restApi.excludeUserGroups, $scope.experiment.excludeUserGroups), 'text').toString();
        $scope.experiment.includeUserAgentRegexes = _.pluck(experimentFormService.collectionForEditting(MetaData.restApi.userAgentRegexes, $scope.experiment.includeUserAgentRegexes), 'text').toString();
        $scope.experiment.excludeUserAgentRegexes = _.pluck(experimentFormService.collectionForEditting(MetaData.restApi.userAgentRegexes, $scope.experiment.excludeUserAgentRegexes), 'text').toString();
        $scope.experiment.languages = _.pluck(experimentFormService.collectionForEditting(MetaData.restApi.languages, $scope.experiment.languages), 'text').toString();
        $scope.experiment.guids = (!$scope.experiment.guids || $scope.experiment.guids.length === 0) ? 'None' : ($scope.experiment.guidsFilterInclude ? 'Inc Guids: ' : 'Exc Guids: ') + $scope.experiment.guids.toString();
        $scope.experimentProperties = ['id', 'name', 'type', 'creator', 'state', 'paused', 'creationDate', 'lastUpdated', 'scope', 'key', 'startDate', 'endDate'];
        $scope.filters = ['geo', 'languages', 'guids', 'users', 'wixUsers'];

        $timeout(function () {
          $scope.dataLoading = false;
        }, 0);
      });
    });
  }]);

'use strict';

angular.module('uiPetri')
  .factory('modalHelper', ["$modal", "$log", "$window", "_", function ($modal, $log, $window, _) {
    return {
      modalInstance:  function (templateUrl, controller, className, resolve, okCallBack, cancelCallback) {
        var parameters = {
          backdrop: 'static',
          dialogFade: false,
          windowClass: className,
          templateUrl: templateUrl,
          controller: controller,
          resolve: resolve
        };
        var modalInstance = $modal.open(parameters);
        modalInstance.result.then(function () {
        }, function (result) {
          $log.info('Modal dismissed at: ' + new Date(), 'with result = ', result);
          if (result) {
            if (_.isFunction(okCallBack)) {
              okCallBack();
            }
          } else {
            if (_.isFunction(cancelCallback)) {
              cancelCallback();
            }
          }
        });
      }
    };
  }]);

'use strict';
angular.module('uiPetri').
  controller('modalController', ["$scope", "$modalInstance", "content", "Reports", "ReportMetric", function ($scope, $modalInstance, content, Reports, ReportMetric) {
  $scope.content = content;

  $scope.exitScope = function () {
    $modalInstance.dismiss(false);
  };
  $scope.apply = function () {
    $modalInstance.dismiss(true);
  };

  $scope.cancel = function () {
    $scope.exitScope();
  };

  $scope.onFileSelect = function ($files) {
    $scope.file = $files[0];
    $scope.reportsStatus = 'uploadingReport';
    Reports.postAReport($scope.file, content.body.id)
      .then(function () {
        $scope.reportsStatus = 'uploadedSuccessfully';
      }, function (error) {
        $scope.reportsStatus = 'problemUploadingFile';
        $scope.uploadError = error;
      })
      .then(function () {
        $scope.getReportUrl();
      });
  };

  $scope.getReportUrl = function () {
    Reports.getAReportUrl(content.origId)
      .then(function (payload) {
        if (payload.link) {
          $scope.reportsUrlExists = true;
          $scope.reportsUrl = payload.link;
        } else {
          $scope.reportsUrlExists = false;
        }
      }, function () {
        $scope.reportsUrlExists = false;
      });
  };

  $scope.getReportMetricData = function () {
    ReportMetric.getReportMetric(content.body.id)
      .then(function (payload) {
        $scope.reportMetric = payload;
      });
  };

}]);

'use strict';
angular.module('uiPetri').controller('loginController', ["$scope", "AuthenticationService", "clientConfig", function loginController($scope, AuthenticationService, clientConfig) {
  //VgtWH6JQ3gCFoDAPIVrjCqjX
  $scope.dataLoading = true;
  $scope.action = 'https://accounts.google.com/o/oauth2/auth?client_id=' + clientConfig.auth.clientId + '&redirect_uri=' + clientConfig.auth.redirectUri + '&response_type=code&scope=https://www.googleapis.com/auth/userinfo.profile%20https://www.googleapis.com/auth/userinfo.email';

  $scope.useBoAuthenticationServer = clientConfig.useBoAuthenticationServer;
  $scope.login = {
    label: 'login',
    user: undefined,
    login: false
  };

  function onBoAuthentication() {
    AuthenticationService.isBoAuthenticated(true,
      function (data) {
        $scope.login = angular.copy(data);
        if ($scope.login.login) {
          AuthenticationService.getBoUser(function (user) {
            $scope.login.user = user;
          });
        }
      });
  }

  function onLocalAuthentication() {
    AuthenticationService.isAuthenticated(false,
      function (data) {
        $scope.login = angular.copy(data);
        if ($scope.login.login) {
          AuthenticationService.getUser(function (user) {
            $scope.login.user = user;
          });
        }
      });
  }

  function isAuthentication() {
    if (clientConfig.useBoAuthenticationServer) {
      onBoAuthentication();
    } else {
      onLocalAuthentication();
    }

  }

  $scope.loginClick = function () {
    isAuthentication();

  };

  isAuthentication();

  $scope.logout = function () {
    AuthenticationService.logout(function (data) {
      $scope.login = angular.copy(data);
    });
  };
  $scope.bologout = function () {
    AuthenticationService.bologout(function (data) {
      $scope.login = angular.copy(data);
    });
  };
  $scope.$on('shouldIdentify', function () {
    $scope.logout();
  });
}]);

'use strict';
angular.module('uiPetri')
  .controller('errorController', ["$scope", "$window", "$rootScope", "_", function ($scope, $window, $rootScope, _) {
    $scope.toggle = false;
    $scope.buttonMoreText = 'More';
    $scope.response = {data: {errorCode: -1, errorDescription: ''}, config: {method: '', url: ''}, status: -1};

    $scope.showMore = function () {
      $scope.toggle = !$scope.toggle;
      if ($scope.toggle) {
        $scope.buttonMoreText = 'Less';
      } else {
        $scope.buttonMoreText = 'More';
      }
      $scope.response = $rootScope.response;
      try {
        if (_.isObject($rootScope.response.data)) {
          return;
        }
        if (_.isString($rootScope.response.data)) {
          $scope.response.data = {errorCode: '', errorDescription: $rootScope.response.data};
        }
      }
      catch (err) {
        $scope.response = {data: {errorCode: -1, errorDescription: 'unknown'}, config: {method: '', url: ''}, status: -1};
      }
    };

  }]);

'use strict';
angular.module('uiPetri')
  .filter('trunc', function () {
    return function (value, wordwise, max, tail) {
      if (!value) {
        return '';
      }
      max = parseInt(max, 10);
      if (!max) {
        return value;
      }
      if (value.length <= max) {
        return value;
      }

      value = value.substr(0, max);
      if (wordwise) {
        var lastspace = value.lastIndexOf(' ');
        if (lastspace !== -1) {
          value = value.substr(0, lastspace);
        }
      }
      return value + (tail || ' …');
    };
  })
  .filter('Locale', ["tmService", function (tmService) {
    return function (value) {
      if (!value) {
        return value;
      }

      return tmService.UtcTtoLocale(value);
    };
  }])
  .filter('mail2name', function () {
    return function (value) {
      if (!value) {
        return value;
      }
      return value.substring(0, value.length - 8);
    };
  });

'use strict';

angular.module('uiPetri')
  .config(["$httpProvider", function ($httpProvider) {
    $httpProvider.responseInterceptors.push('payloadStripper');
  }])
  .factory('payloadStripper', ["$q", "$log", "$location", "_", "$rootScope", "$window", "clientConfig", function ($q, $log, $location, _, $rootScope, $window, clientConfig) {
    function urlIsInReconnectList(url) {
      return _.find(apiMapping, function (currUrl) {
        return currUrl.indexOf(url) !== -1;
      });
    }
    var domainResolver = function (bo) {
      if (bo) {
        return $window.location.host.replace('guineapig', 'bo');
      } else {
        return $window.location.host;

      }
    };

    var apiMapping = [
        '/v1/' + 'Experiments',
        '/v1/' + 'Specs'
    ];

    function errorHandler(response) {
      if (response.data &&
        response.data.errorDescription &&
        response.data.errorDescription.indexOf('required Users Role USER') !== -1) {
        $location.path('login/home');
        $rootScope.$broadcast('shouldIdentify');
        return;
      }
      if (response.status === 403) {
        $window.location.assign('http://' + domainResolver(true) + '/wix-authentication-server/login?url=' + clientConfig.boredirectUri);
        return;
      }
      $rootScope.response =  response;
      if (urlIsInReconnectList(response.config.url)) {
        $location.path('login/reconnect');
      }
    }

    return function (promise) {
      return promise.then(function (response) {
        if (response.data && response.data.success === false) {
          errorHandler(response);
        }
        return response;
      }, function (response) {
        errorHandler(response);
        return $q.reject(response);
      });
    };
  }]);

'use strict';

angular.module('uiPetri')
  .factory('specFilters', ["$log", "_", "configData", function ($log, _, configData) {

    //TODO : either fetch this map from server, or at least read the constant value from server (exp : users filters)
    //TODO : either fetch this map from server, or at least read the constant value from server (exp : users filters)
    //TODO : either fetch this map from server, or at least read the constant value from server (exp : users filters)
    //TODO : either fetch this map from server, or at least read the constant value from server (exp : users filters)

    function activateButton(buttons, experiment) {
      var trueFilters = [];
      if (experiment.wixUsers.value) {
        trueFilters.push('wixUsers');
      }
      if (experiment.allRegistered.value) {
        trueFilters.push('allRegistered');
      }
      if (experiment.newRegistered.value) {
        trueFilters.push('newRegistered');
      }
      if (experiment.nonRegistered.value) {
        trueFilters.push('nonRegistered');
      }
      if (experiment.anonymous.value) {
        trueFilters.push('anonymous');
      }
      if (experiment.specificUsers.value) {
        trueFilters.push('specificUsers');
      }

      return _.find(buttons, function (btn) {
        return (_.difference(btn.trueFilter, trueFilters).length === 0) && (_.difference(trueFilters, btn.trueFilter).length === 0);
      });
    }

    function getSpec(map, scope, key) {
      return _.find(map[scope], function (e) {
        return (configData.isPublicScope(scope)) ? true /*1 and only 1 spec is available*/ : angular.lowercase(e.key) ===  angular.lowercase(key);
      });
    }

    var getButton = function (filters, id) {
      return _.find(_.values(filters.controllers), function (e) {
        return e.id === id;
      });
    };
    var onClick = function (filters, id, experiment) {
      $log.info('on click : id=' + id);
      var selectors =  _.filter(_.values(filters.controllers), function (e) {
        return e.id && e.type && e.type === 'selector';
      });
      filters.btn = getButton(filters, id);
      $log.info('active button became :  id=' + filters.btn.id);

      _.each(selectors, function (e) {
        e.show = _.find(filters.btn.selectors, function (e1) {
          return e1 === e.id || e1.id === e.id;
        });
        e.label = undefined;
        if (e.show) {
          e.label = e.show.label;
        } else {
          experiment[e.id].clean(experiment);
        }
      });
    };

    var setShow = function (btn, registered, ft) {
      var chars = btn.experimentChars;

      if (chars.ft === undefined && chars.registered === undefined) {
        btn.show = true; //don't care
      } else if (chars.ft === undefined) {
        btn.show = chars.registered === registered; //type is don't care
      } else if (chars.registered === undefined) {
        btn.show = chars.ft === ft; //registered/non-registered is don't care
      } else {
        btn.show =  ((registered === chars.registered) && (ft === chars.ft));
      }
    };

    var filters = function (_scopeMap) {
      var appliedToNewRegisteredUsersString = 'The following will be applied ONLY to "New Registered Users"';
      var appliedToAllRegisterUsersString = 'The following will be applied ONLY to "All Registered Users"';
      var allNewRegisteredUsersFilteredByGeoStr = 'all new registered users (filtered by geo, lang ...)';
      var allRegisteredUsersFilteredByGeoStr = 'all registered users (filtered by geo, lang ...)';
      var multipleGuidsTitleString = 'For multiple guids paste a string of the following format: <valid_guid1>,<valid_guid_2>,...';
      var conductLimitTitleString = 'The following will limit the number of times the experiment is conducted';
      return {
        scopeMap: _scopeMap,
        show: false,

        controllers: {

          /*buttons*/
          specificUsers: {id: 'specificUsers', show: true, text: 'Specific Users', type: 'button', label: undefined, selectors: ['includeGuids'], title: 'specific users', trueFilter: ['specificUsers'], experimentChars: {registered: true}, isValid: function (experiment) {
            return experiment.includeGuids.value.length > 0;
          }, error: 'Please select some GUIDs'},
          wixUsersOnly: {id: 'wixUsersOnly', show: true, text: 'Wix Employee Only', type: 'button', label: undefined, selectors: ['excludeGuids', 'includeGuids', 'excludeUserGroups'], title: 'all wix employees', trueFilter: ['wixUsers'], experimentChars: {registered: true, ft: true}},
          newRegistered: {id: 'newRegistered', show: true, text: 'New Registered Users', type: 'button', label: undefined, selectors: ['excludeGuids', 'includeGuids', 'excludeUserGroups', {id: 'geo', label: appliedToNewRegisteredUsersString}, 'languages', 'hosts', 'includeUserAgentRegexes', 'excludeUserAgentRegexes', 'metaSiteIds'], title: allNewRegisteredUsersFilteredByGeoStr, trueFilter: ['newRegistered'], experimentChars: {registered: true}},
          allRegistered: {id: 'allRegistered', show: true, text: 'All Registered Users', type: 'button', label: undefined, selectors: ['excludeGuids', 'includeGuids', 'excludeUserGroups', 'metaSiteIds', {id: 'geo', label: appliedToAllRegisterUsersString}, 'languages', 'hosts', 'includeUserAgentRegexes', 'excludeUserAgentRegexes', 'metaSiteIds'], title: allRegisteredUsersFilteredByGeoStr, trueFilter: ['allRegistered'], experimentChars: {registered: true}},
          wixUsersNewRegistered: {id: 'wixUsersNewRegistered', show: true, text: 'Wix Employee & New Registered', type: 'button', label: undefined, selectors: ['excludeGuids', 'includeGuids','excludeUserGroups', {id: 'geo', label: appliedToNewRegisteredUsersString}, 'languages', 'hosts', 'includeUserAgentRegexes', 'excludeUserAgentRegexes', 'metaSiteIds'], title: allNewRegisteredUsersFilteredByGeoStr + ', and all wix employees', trueFilter: ['wixUsers', 'newRegistered'], experimentChars: {registered: true, ft: true}},
          wixUsersAllRegistered: {id: 'wixUsersAllRegistered', show: true, text: 'Wix Employee & All Registered', type: 'button', label: undefined, selectors: ['excludeGuids', 'includeGuids', 'excludeUserGroups', {id: 'geo', label: appliedToAllRegisterUsersString}, 'languages', 'hosts', 'includeUserAgentRegexes', 'excludeUserAgentRegexes', 'metaSiteIds'], title: allRegisteredUsersFilteredByGeoStr + ', and all wix employees', trueFilter: ['wixUsers', 'allRegistered'], experimentChars: {registered: true, ft: true}},
          anonymous: {id: 'anonymous', show: true, text: 'First Time Anonymous Visitors', type: 'button', selectors: ['geo', 'languages', 'hosts', 'includeUserAgentRegexes', 'excludeUserAgentRegexes', 'metaSiteIds'], title: 'all first time visitors (filtered by geo, lang ...)', trueFilter: ['anonymous'], experimentChars: {registered: false}},
          nonRegistered: {id: 'nonRegistered', show: true, text: 'No Existing Registered Users', type: 'button', selectors: ['geo', 'languages', 'hosts', 'includeUserAgentRegexes', 'excludeUserAgentRegexes', 'metaSiteIds'], title: 'No Existing Registered Users', trueFilter: ['nonRegistered'], experimentChars: {registered: false}},
          allUsers: {id: 'allUsers', show: true, text: 'All Users', type: 'button', label: undefined, selectors: ['geo', 'languages', 'hosts', 'includeUserAgentRegexes', 'excludeUserAgentRegexes', 'metaSiteIds'], title: 'all users (registered/non-registered), filtered ...', trueFilter: [], experimentChars: {registered: false}},
          openToAll: {id: 'openToAll', show: true, text: 'Open To All', type: 'button', label: undefined, selectors: [], title: 'this experiment has no filters', trueFilter: [], experimentChars: {registered: true, ft: true}},

          /*selectors*/
          excludeGuids: {id: 'excludeGuids', show: false, title: multipleGuidsTitleString, type: 'selector'},
          includeGuids: {id: 'includeGuids', show: false, title: multipleGuidsTitleString, type: 'selector'},
          conductLimit: {id: 'conductLimit', show: true, title: conductLimitTitleString},
          metaSiteIds: {id: 'metaSiteIds', show: false, title: 'For multiple meta site ids paste a string of the following format: <valid_meta_site_id_1>,<valid_meta_site_id_2>,...', type: 'selector'},
          geo: {id: 'geo', show: false, type: 'selector', label: undefined},
          excludeUserGroups: {id: 'excludeUserGroups', show: false, type: 'selector', label: undefined},
          includeUserAgentRegexes: {id: 'includeUserAgentRegexes', show: false, type: 'selector', label: undefined},
          excludeUserAgentRegexes: {id: 'excludeUserAgentRegexes', show: false, type: 'selector', label: undefined},
          lang: {id: 'languages', show: false, type: 'selector'},
          hosts: {id: 'hosts', show: false, type: 'selector', title: 'Make sure you know what your host name is  (use app-info or run \'hostname\' on the machine)'}
        },

        buttons: function () {
          return _.filter(_.values(this.controllers), function (e) {
            return e.id && e.type && e.type === 'button';
          });
        },

        calculate: function (experiment) {
          $log.info('calculate ... ');
          this.show = true;
          var registered = getSpec(this.scopeMap, experiment.scope.value, experiment.key.value).forRegisteredUsers;
          var ft = experiment.type.value === 'featureToggle';
          setShow(this.controllers.openToAll, registered, ft);
          setShow(this.controllers.allUsers, registered, ft);
          setShow(this.controllers.wixUsersOnly, registered, ft);
          setShow(this.controllers.wixUsersNewRegistered, registered, ft);
          setShow(this.controllers.specificUsers, registered, ft);
          setShow(this.controllers.allRegistered, registered, ft);
          setShow(this.controllers.newRegistered, registered, ft);
          setShow(this.controllers.wixUsersAllRegistered, registered, ft);
          setShow(this.controllers.anonymous, registered, ft);
          setShow(this.controllers.nonRegistered, registered, ft);

          var buttons =  _.filter(_.values(this.controllers), function (e) {
            return e.id && e.type && e.type === 'button' && e.show;
          });

          this.btn = activateButton(buttons, experiment);

          if (!this.btn || !this.btn.show) {
            this.btn = _.find(buttons, function (e) {
              return e.show;
            });
          }
          onClick(this, this.btn.id, experiment);
          return buttons;
        }
      };
    };

    return filters;
  }]);

'use strict';

angular.module('uiPetri')
  .factory('experimentFormService', ["ExperimentDataType", "tmService", "MetaData", "AuthenticationService", "_", "$log", "$filter", "configData", function (ExperimentDataType, tmService, MetaData, AuthenticationService, _, $log, $filter, configData) {
    var formControl = function (value, disabled, invalid, clean) {
      return {
        disabled: disabled === undefined ? false : disabled,
        invalid: invalid === undefined ? false : invalid,
        value: value,
        value2: value,
        origin: value,
        clean: clean || function () {}
      };
    };
    var calculateFeatureValue = function (experiment) {
      if (experiment.type.value === ExperimentDataType.experimentType(true)) {
        //feature toggle
        for (var i = 0; i < experiment.groups.value.length; i++) {
          if (experiment.groups.value[i].chunk === 100) {
            return experiment.groups.value[i].value;
          }
        }
        return experiment.groups.value[0].value;
      } else {
        return experiment.groups.value[0].value;
      }
    };

    var collectionForEditting = function (map, selected) {
      var collectionForEditting = [];
      if (selected === undefined) {
        return [];
      }

      for (var i = 0; i < selected.length; i++) {
        var g = _.where(map, {
          id: selected[i]
        });

        collectionForEditting.push(g[0]);
      }
      return collectionForEditting;
    };

    var getMinDateTimeFrom = function (experiment) {
      var now = tmService.now();
      var min0 = tmService.minutesFrom(now, MetaData.Config.minTime);
      min0 = tmService.makeTime(min0, min0);
      return new Date(_.max([min0.getTime(), experiment.parentStartTime]));
    };

    var isTimeEditableTimeFrom = function (experiment) {
      var isActive = (experiment.state === ExperimentDataType.experimentState.StateActive) || (experiment.state === ExperimentDataType.experimentState.StatePaused);

      if (experiment.id === 0) {
        return true;
      } else {
        if (isActive) {
          //start is no longer editable
          return false;
        }
        return true;
      }
    };

    var isTimeEditableTimeTo = function (experiment) {
      var now = new Date();
      if (experiment.id === 0) {
        return true;
      } else {
        if (experiment.endDate < now) {
          //start is no longer editable
          return false;
        }
      }
    };

    var listToString = function (arrayofstrings) {
      _.each(arrayofstrings, function (e) {
        e = e.trim();
      });
      return arrayofstrings.join();

    };
    var stringToList = function (string) {
      if (string.trim().length === 0) {
        return [];
      }
      var arrayofstrings = string.split(',');
      arrayofstrings = _.map(arrayofstrings, function (e) {
        return e === null ? '' : e.trim();
      });
      return arrayofstrings;
    };

    var multySelectItems = [];

    var experimentFormService = {

      collectionForEditting: collectionForEditting,

      init: function (experiment) {
        var form = {
          //these two are nescessary for ui resolved data to be displayed

          scopes: [],
          allspecs: [],
          geo: [],
          isCollapsed: true //debug!!!!!!!!!!
        };

        var uiExperiment = angular.copy(experiment);

        var serverFilters = [uiExperiment.allRegistered, uiExperiment.newRegistered, uiExperiment.nonRegistered, uiExperiment.anonymous, uiExperiment.wixUsers];
        experiment.specificUsers = false;

        if (!_.contains(serverFilters, true) && ((experiment.includeGuids.length > 0) || (experiment.excludeGuids.length > 0))) {
          experiment.specificUsers = true;
        }
        uiExperiment.type = formControl(experiment.type);
        uiExperiment.specificUsers = formControl(experiment.specificUsers, false, false, function (experiment) {
          experiment.specificUsers.value = false;
        });
        uiExperiment.wixUsers = formControl(experiment.wixUsers, false, false, function (experiment) {
          experiment.wixUsers.value = false;
        });
        uiExperiment.allRegistered = formControl(experiment.allRegistered, false, false, function (experiment) {
          experiment.allRegistered.value = false;
        });
        uiExperiment.newRegistered = formControl(experiment.newRegistered, false, false, function (experiment) {
          experiment.newRegistered.value = false;
        });
        uiExperiment.nonRegistered = formControl(experiment.nonRegistered, false, false, function (experiment) {
          experiment.nonRegistered.value = false;
        });
        uiExperiment.anonymous = formControl(experiment.anonymous, false, false, function (experiment) {
          experiment.anonymous.value = false;
        });
        uiExperiment.groups = formControl(experiment.groups);
        uiExperiment.description = formControl(experiment.description);
        uiExperiment.comment = formControl(experiment.comment);
        uiExperiment.specKey = formControl(experiment.specKey);

        form.minDateTime = getMinDateTimeFrom(uiExperiment);
        form.error = MetaData.Config.modalHeader;

        uiExperiment.geo = formControl(collectionForEditting(MetaData.restApi.geo, experiment.geo), false, false, function (experiment) {
          experiment.geo.value = [];
        });
        uiExperiment.excludeUserGroups = formControl(collectionForEditting(MetaData.restApi.excludeUserGroups, experiment.excludeUserGroups), false, false, function (experiment) {
          experiment.excludeUserGroups.value = [];
        });
        uiExperiment.includeUserAgentRegexes = formControl(collectionForEditting(MetaData.restApi.userAgentRegexes, experiment.includeUserAgentRegexes), false, false, function (experiment) {
          experiment.includeUserAgentRegexes.value = [];
        });
        uiExperiment.excludeUserAgentRegexes = formControl(collectionForEditting(MetaData.restApi.userAgentRegexes, experiment.excludeUserAgentRegexes), false, false, function (experiment) {
          experiment.excludeUserAgentRegexes.value = [];
        });
        uiExperiment.excludeGeo = formControl(experiment.excludeGeo, false, false, function (experiment) {
          experiment.excludeGeo.value = false;
        });
        uiExperiment.languages = formControl(collectionForEditting(MetaData.restApi.languages, experiment.languages), false, false, function (experiment) {
          experiment.languages.value = [];
        });
        uiExperiment.hosts = formControl(listToString(experiment.hosts), false, false, function (experiment) {
          experiment.hosts.value = '';
        });
        uiExperiment.includeGuids = formControl(experiment.includeGuids, false, false, function (experiment) {
          experiment.includeGuids.value = [];
        });
        uiExperiment.metaSiteIds = formControl(experiment.metaSiteIds, false, false, function (experiment) {
          experiment.metaSiteIds.value = [];
        });
        uiExperiment.excludeMetaSiteIds = formControl(experiment.excludeMetaSiteIds, false, false, function (experiment) {
          experiment.excludeMetaSiteIds.value = false;
        });
        uiExperiment.excludeGuids = formControl(experiment.excludeGuids, false, false, function (experiment) {
          experiment.excludeGuids.value = [];
        });
        uiExperiment.conductLimit = formControl(experiment.conductLimit, false, false, function (experiment) {
          experiment.conductLimit.value = 0;
        });
        form.scopes = MetaData.scopes;
        form.scopesmap = MetaData.restApi.scopesmap;
        if (experiment.id === 0) {
          //new Experiment
          uiExperiment.featureValue = formControl('');
          uiExperiment.name = formControl(experiment.name);
          uiExperiment.key = formControl(experiment.key);
          uiExperiment.scope = formControl(experiment.scope);
          form.specSelectTest = 'Choose';
          form.scopeSelectTest = 'Choose';
          uiExperiment.startDate = formControl(tmService.minutesFrom(form.minDateTime, 3), !isTimeEditableTimeFrom(experiment, form.minDateTime));
          uiExperiment.endDate = formControl(tmService.yearFrom(form.minDateTime));

          AuthenticationService.getUser(function (user) {
            uiExperiment.creator = user;

          });
        } else {
          //edited experiment
          uiExperiment.featureValue = formControl(calculateFeatureValue(uiExperiment));
          uiExperiment.name = formControl(experiment.name, true);
          uiExperiment.key = formControl(experiment.key, true);
          uiExperiment.scope = formControl(experiment.scope, true);
          form.specSelectTest = experiment.key;
          form.scopeSelectTest = experiment.scope;
          var isEditableDateTime = isTimeEditableTimeFrom(experiment, form.minDateTime);
          uiExperiment.startDate = formControl(tmService.n2dt(experiment.startDate), !isEditableDateTime);
          uiExperiment.endDate = formControl(tmService.n2dt(experiment.endDate), !isTimeEditableTimeTo(experiment));

          form.allspecs = [{
            key: experiment.key
          }];
          form.scopes = [experiment.scope];
        }

        //TODO:replace these contacts with data from UI, integrate it with scopesmap' in order to verify users filter-scope constrain

        form.geo = MetaData.restApi.geo;
        form.excludeUserGroups = MetaData.restApi.excludeUserGroups;
        form.includeUserAgentRegexes = MetaData.restApi.userAgentRegexes;
        form.excludeUserAgentRegexes = MetaData.restApi.userAgentRegexes;
        form.languages = MetaData.restApi.languages;

        form.total = 0;
        form.openedfrom = false;
        form.openedto = false;
        form.timePickerOptions = {
          hstep: 1,
          mstep: 15

        };

        return {
          uiExperiment: uiExperiment,
          form: form
        };
      },

      initDuplicate: function (experiment, callbackWhenScopeMapIsReady, callbackOnScopeMapFailure) {

        var form = {
          //these two are nescessary for ui resolved data to be displayed
          scopes: [],
          allspecs: [],
          geo: [],
          isCollapsed: true //debug!!!!!!!!!!
        };

        var uiExperiment = angular.copy(experiment);
        uiExperiment.editable = true;
        uiExperiment.type = formControl(experiment.type);
        uiExperiment.groups = formControl(experiment.groups);
        uiExperiment.featureValue = formControl(calculateFeatureValue(uiExperiment));
        var serverFilters = [uiExperiment.allRegistered, uiExperiment.newRegistered, uiExperiment.nonRegistered, uiExperiment.anonymous, uiExperiment.wixUsers];
        experiment.specificUsers = false;

        if (!_.contains(serverFilters, true) && ((experiment.includeGuids.length > 0) || (experiment.excludeGuids.length > 0))) {
          uiExperiment.specificUsers = true;
        }
        uiExperiment.wixUsers = formControl(experiment.wixUsers, false, false, function (experiment) {
          experiment.wixUsers.value = false;
        });
        uiExperiment.allRegistered = formControl(experiment.allRegistered, false, false, function (experiment) {
          experiment.allRegistered.value = false;
        });
        uiExperiment.newRegistered = formControl(experiment.newRegistered, false, false, function (experiment) {
          experiment.newRegistered.value = false;
        });
        uiExperiment.nonRegistered = formControl(experiment.nonRegistered, false, false, function (experiment) {
          experiment.nonRegistered.value = false;
        });
        uiExperiment.anonymous = formControl(experiment.anonymous, false, false, function (experiment) {
          experiment.anonymous.value = false;
        });
        uiExperiment.anonymous = formControl(experiment.anonymous, false, false, function (experiment) {
          experiment.anonymous.value = false;
        });
        uiExperiment.specificUsers = formControl(experiment.specificUsers);
        uiExperiment.description = formControl(experiment.description);
        uiExperiment.comment = formControl(experiment.comment);
        form.minDateTime = getMinDateTimeFrom(uiExperiment);
        form.error = MetaData.Config.modalHeaderError;
        uiExperiment.name = formControl(experiment.name);
        uiExperiment.key = formControl(experiment.key);
        uiExperiment.specKey = formControl(experiment.specKey);
        uiExperiment.scope = formControl(experiment.scope);
        uiExperiment.startDate = formControl(tmService.minutesFrom(form.minDateTime, 3), !isTimeEditableTimeFrom(experiment, form.minDateTime));
        uiExperiment.endDate = formControl(tmService.yearFrom(form.minDateTime));
        uiExperiment.paused = false;

        uiExperiment.geo = formControl(collectionForEditting(MetaData.restApi.geo, experiment.geo), false, false, function (experiment) {
          experiment.geo.value = [];
        });
        uiExperiment.excludeUserGroups = formControl(collectionForEditting(MetaData.restApi.excludeUserGroups, experiment.excludeUserGroups), false, false, function (experiment) {
          experiment.excludeUserGroups.value = [];
        });
        uiExperiment.includeUserAgentRegexes = formControl(collectionForEditting(MetaData.restApi.userAgentRegexes, experiment.includeUserAgentRegexes), false, false, function (experiment) {
          experiment.includeUserAgentRegexes.value = [];
        });
        uiExperiment.excludeUserAgentRegexes = formControl(collectionForEditting(MetaData.restApi.userAgentRegexes, experiment.excludeUserAgentRegexes), false, false, function (experiment) {
          experiment.excludeUserAgentRegexes.value = [];
        });
        uiExperiment.excludeGeo = formControl(experiment.excludeGeo, false, false, function (experiment) {
          experiment.excludeGeo.value = false;
        });
        uiExperiment.languages = formControl(collectionForEditting(MetaData.restApi.languages, experiment.languages), false, false, function (experiment) {
          experiment.languages.value = [];
        });
        uiExperiment.hosts = formControl(listToString(experiment.hosts), false, false, function (experiment) {
          experiment.hosts.value = '';
        });
        uiExperiment.excludeGuids = formControl(experiment.excludeGuids, false, false, function (experiment) {
          experiment.excludeGuids.value = [];
        });
        uiExperiment.includeGuids = formControl(experiment.includeGuids, false, false, function (experiment) {
          experiment.includeGuids.value = [];
        });
        uiExperiment.metaSiteIds = formControl(experiment.metaSiteIds, false, false, function (experiment) {
          experiment.metaSiteIds.value = [];
        });
        uiExperiment.excludeMetaSiteIds = formControl(experiment.excludeMetaSiteIds, false, false, function (experiment) {
          experiment.excludeMetaSiteIds.value = false;
        });
        uiExperiment.conductLimit = formControl(experiment.conductLimit, false, false, function (experiment) {
          experiment.conductLimit.value = 0;
        });

        AuthenticationService.getUser(function (user) {
          uiExperiment.creator = user;
        });

        form.geo = MetaData.restApi.geo;
        form.excludeUserGroups = MetaData.restApi.excludeUserGroups;
        form.includeUserAgentRegexes = MetaData.restApi.userAgentRegexes;
        form.excludeUserAgentRegexes = MetaData.restApi.userAgentRegexes;
        form.languages = MetaData.restApi.languages;

        form.total = 0;
        form.openedfrom = false;
        form.openedto = false;
        form.timePickerOptions = {
          hstep: 1,
          mstep: 15
        };

        form.scopes = MetaData.scopes;
        form.scopesmap = MetaData.restApi.scopesmap;

        form.allspecs = form.scopesmap[experiment.scope];
        var spec = MetaData.getSpec(form.scopesmap, experiment.scope, experiment.key);

        if (!spec) {
          callbackOnScopeMapFailure();
          return;
        }
        callbackWhenScopeMapIsReady({
          uiExperiment: uiExperiment,
          form: form
        });

        return {
          uiExperiment: uiExperiment,
          form: form
        };
      },

      isValid: function (experiment, filters) {

        experiment.startDate.invalid = false;
        experiment.endDate.invalid = false;
        experiment.groups.invalid = false;
        experiment.name.invalid = false;
        experiment.scope.invalid = false;
        experiment.key.invalid = false;

        function isValidUrl(string) {

          var regex = new RegExp(/^[a-zA-Z0-9-_]+[\/|.]?[a-zA-Z0-9_-]+]?$/);
          return regex.test(string);
        }

        function isStringValid(string) {
          return _.isString(string) && (string.trim().length > 0) && string !== 'None';
        }

        function isValidTags(experiment, propertyName) {
          var res = true;
          var tags = experiment[propertyName].value;
          if (tags instanceof Array) {
            tags.forEach(function (tag) {
              var isValid = (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tag));
              if (!isValid) {
                var invalidStr = (propertyName === 'metaSiteIds') ? ' is not a valid Meta Site Id' : ' is not a valid GUID';
                experiment[propertyName].error = tag + invalidStr;
                res = false;
              }
            });
          }
          return res;
        }

        function isValidGroups(groups) {
          if (groups === undefined) {
            return false;
          }
          if (groups.length < 1) {
            return false;
          }

          if (_.uniq(_.pluck(groups, 'value')).length !== groups.length) {
            return false;
          }

          var total = 0;

          for (var i = 0; i < groups.length; i++) {
            if (groups[i].value === undefined) {
              return false;
            }
            total += groups[i].chunk;
          }
          return total === 100;
        }

        function isValidStartDate(experiment) {
          var tm = tmService.makeTime(experiment.startDate.value, experiment.startDate.value);

          if (experiment.id !== 0) {
            //editable, its start time might be smaller the the minimum
            //it ok, as long as it was not changed in this modal session, to a smaler value

            if (experiment.startDate.origin <= experiment.startDate.value) {
              return true;
            }
          }

          experiment.startDate.error = '';
          if (tm < getMinDateTimeFrom(experiment)) {
            experiment.startDate.error = MetaData.Config.startTimeError.text.replace('__time__', getMinDateTimeFrom(experiment));
            return false;
          }
          return true;
        }

        function isValidEndDate(experiment) {

          experiment.endDate.error = '';
          var valid = experiment.startDate.value < experiment.endDate.value;
          if (!valid) {
            experiment.endDate.error = MetaData.Config.endTimeError.text;
          }
          return valid;
        }

        var invalid = _.contains([
          filters ? (filters.invalid = filters && filters.btn.isValid && !filters.btn.isValid(experiment)) : false,
          experiment.startDate.invalid = !isValidStartDate(experiment),
          experiment.endDate.invalid = !isValidEndDate(experiment),
          experiment.groups.invalid = !isValidGroups(experiment.groups.value),
          experiment.name.invalid = !isStringValid(experiment.name.value),
          experiment.scope.invalid = !isStringValid(experiment.scope.value),
          experiment.key.invalid = configData.isPublicScope(experiment.scope.value) ? (!isValidUrl(experiment.key.value2)) : (!isStringValid(experiment.key.value) && (!isStringValid(experiment.key.value2))),
          //experiment.mainFilter.invalid = !isMainFilterValid(experiment),
          experiment.includeGuids.invalid = !isValidTags(experiment, 'includeGuids'),
          experiment.metaSiteIds.invalid = !isValidTags(experiment, 'metaSiteIds'),
          experiment.excludeGuids.invalid = !isValidTags(experiment, 'excludeGuids')
        ], true);

        return !invalid;
      },

      toExperiment: function (experiment) {
        experiment.startDate = tmService.dt2n(experiment.startDate.value);
        experiment.endDate = tmService.dt2n(experiment.endDate.value);
        experiment.name = experiment.name.value;
        experiment.description = experiment.description.value;
        experiment.comment = experiment.comment.value === undefined ? 'no comment' : experiment.comment.value;
        experiment.type = experiment.type.value;
        experiment.scope = experiment.scope.value;
        experiment.geo = _.pluck(experiment.geo.value, 'id');
        experiment.excludeUserGroups = _.pluck(experiment.excludeUserGroups.value, 'id');
        experiment.includeUserAgentRegexes = _.pluck(experiment.includeUserAgentRegexes.value, 'id');
        experiment.excludeUserAgentRegexes = _.pluck(experiment.excludeUserAgentRegexes.value, 'id');
        experiment.excludeGeo = experiment.excludeGeo.value;
        experiment.includeGuids = experiment.includeGuids.value;
        experiment.metaSiteIds = experiment.metaSiteIds.value;
        experiment.conductLimit = experiment.conductLimit.value;
        experiment.excludeMetaSiteIds = experiment.excludeMetaSiteIds.value;
        experiment.excludeGuids = experiment.excludeGuids.value;
        experiment.languages = _.pluck(experiment.languages.value, 'id');
        experiment.hosts = stringToList(experiment.hosts.value);
        _.each(experiment.groups.value, function (group) {
          delete group.userTestGroup;
        });
        experiment.groups = experiment.groups.value;
        experiment.wixUsers = experiment.wixUsers.value;
        experiment.allRegistered = experiment.allRegistered.value;
        experiment.newRegistered = experiment.newRegistered.value;
        experiment.nonRegistered = experiment.nonRegistered.value;
        experiment.anonymous = experiment.anonymous.value;
        experiment.key = configData.isPublicScope(experiment.scope) ? experiment.key.value2 : experiment.key.value;
        experiment.specKey = experiment.specKey.value;

        delete experiment.specificUsers;
        delete experiment.featureValue;
        delete experiment.endTime;
        return experiment;
      },

      onRemove: function (all, deletedOne) {
        var without = _.without(all, deletedOne);
        return without;
      },

      updateSelectMulty: function (element, selectedItems) {
        element.data().select2.updateSelection(selectedItems);
      },

      initGUIDAndMetaSiteIdOptions: function (tags) {
        return {
          multiple: true,
          simple_tags: true,
          tags: [tags],
          maximumSelectionSize: 200
        };
      },

      initSelectMultyTags: function (id, element) {
        function test(g) {
          return !(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(g));
        }

        element.on('select2-selecting', function (e) {
          var guids = e.val.split(',');
          if (_.find(guids, test)) {
            e.preventDefault();
          }
          return;
        });
      },


      initSelectMulty: function (id, element, allItems, selectedItems, onChange, onRemove) {
        function format(item) {
          var name = item.text.split(' [')[0];
          return '<div title ="' + item.id + '">' + name + '</div>';
        }

        element.select2({
          placeholder: 'Choose...',
          multiple: true,
          allowClear: false,
          closeOnSelect: false,
          formatResult: format,
          formatSelection: format,
          data: allItems
        });
        element.data().select2.updateSelection(selectedItems);

        multySelectItems[id] = {
          onChange: onChange,
          onRemove: onRemove
        };

        element.on('change', function (e) {
          if (e.added === undefined) {
            return;
          }
          multySelectItems[e.target.id].onChange(e.added);
          $log.info('add ', e.added);

        }).on('select2-removed', function (e) {
          multySelectItems[e.target.id].onRemove(e.choice);
          $log.info('remove ', e.choice);
        });
      },

      initSelectSingle: function (id, element, selectedItem, onChange) {
        multySelectItems[id] = {
          e: element,
          onChange: onChange
        };
        element.val(selectedItem);

        element.on('change', function (e) {

          multySelectItems[e.target.id].onChange(multySelectItems[e.target.id].e.val());
          $log.info('value :  ', multySelectItems[e.target.id].e.val());
        });
      },

      experimentDiff: function (left, right) {

        var geoRemoved = _.difference(_.pluck(left.geo.value, 'text'), _.pluck(right.geo.value, 'text'));
        var excludeUserGroupsRemoved = _.difference(_.pluck(left.excludeUserGroups.value, 'text'), _.pluck(right.excludeUserGroups.value, 'text'));
        var includeUserAgentRegexesRemoved = _.difference(_.pluck(left.includeUserAgentRegexes.value, 'text'), _.pluck(right.includeUserAgentRegexes.value, 'text'));
        var excludeUserAgentRegexesRemoved = _.difference(_.pluck(left.excludeUserAgentRegexes.value, 'text'), _.pluck(right.excludeUserAgentRegexes.value, 'text'));
        var geoAdded = _.difference(_.pluck(right.geo.value, 'text'), _.pluck(left.geo.value, 'text'));
        var excludeUserGroupsAdded = _.difference(_.pluck(right.excludeUserGroups.value, 'text'), _.pluck(left.excludeUserGroups.value, 'text'));
        var includeUserAgentRegexesAdded = _.difference(_.pluck(right.includeUserAgentRegexes.value, 'text'), _.pluck(left.includeUserAgentRegexes.value, 'text'));
        var excludeUserAgentRegexesAdded = _.difference(_.pluck(right.excludeUserAgentRegexes.value, 'text'), _.pluck(left.excludeUserAgentRegexes.value, 'text'));
        var languagesRemoved = _.difference(_.pluck(left.languages.value, 'text'), _.pluck(right.languages.value, 'text'));
        var includeGuidsAdded = _.difference(right.includeGuids.value, left.includeGuids.value);
        var includeGuidsRemoved = _.difference(left.includeGuids.value, right.includeGuids.value);
        var metaSiteIdsAdded = _.difference(right.metaSiteIds.value, left.metaSiteIds.value);
        var metaSiteIdsRemoved = _.difference(left.metaSiteIds.value, right.metaSiteIds.value);
        var excludeGuidsAdded = _.difference(right.excludeGuids.value, left.excludeGuids.value);
        var excludeGuidsRemoved = _.difference(left.excludeGuids.value, right.excludeGuids.value);
        var languagesAdded = _.difference(_.pluck(right.languages.value, 'text'), _.pluck(left.languages.value, 'text'));
        var hostsAdded = _.difference(stringToList(right.hosts.value), stringToList(left.hosts.value));
        var hostsRemoved = _.difference(stringToList(left.hosts.value), stringToList(right.hosts.value));
        var testGroupdifference = function (left, right) {
          var getTgOriginal = function (tgNew) {
            return _.find(right, function (t) {
              return (t.value === tgNew.value);
            });
          };
          for (var i = 0; i < left.length; i++) {
            var tgNew = left[i];
            var tgOriginal = getTgOriginal(tgNew);
            if (tgOriginal.chunk !== tgNew.chunk) {
              return true;
            }
          }
          return false;
        };

        function isAdded(left, right, propertyName) {
          return ((left[propertyName].value !== right[propertyName].value) && (right[propertyName].value)) ? right[propertyName].value : undefined;
        }

        function isRemoved(left, right, propertyName) {
          return ((left[propertyName].value !== right[propertyName].value) && (!right[propertyName].value)) ? right[propertyName].value : undefined;
        }
        var isDiff = false;
        var diff = {

          wixUsersAdded: isAdded(left, right, 'wixUsers'),
          wixUsersRemoved: isRemoved(left, right, 'wixUsers'),
          allRegisteredAdded: isAdded(left, right, 'allRegistered'),
          allRegisteredRemoved: isRemoved(left, right, 'allRegistered'),
          newRegisteredAdded: isAdded(left, right, 'newRegistered'),
          newRegisteredRemoved: isRemoved(left, right, 'newRegistered'),
          nonRegisteredAdded: isAdded(left, right, 'nonRegistered'),
          nonRegisteredRemoved: isRemoved(left, right, 'nonRegistered'),
          anonymousAdded: isAdded(left, right, 'anonymous'),
          anonymousRemoved: isRemoved(left, right, 'anonymous'),
          geoBoolean: (function () {
            if (left.excludeGeo.value !== right.excludeGeo.value) {
              if (left.excludeGeo.value) {
                return 'from exclude to include';
              } else {
                return 'from include to exclude';
              }
            }
          })(),
          metaSiteIdBoolean: (function () {
            if (left.excludeMetaSiteIds.value !== right.excludeMetaSiteIds.value) {
              if (left.excludeMetaSiteIds.value) {
                return 'from exclude to include';
              } else {
                return 'from include to exclude';
              }
            }
          })(),
          conductLimitChanged: (function () {
            if (left.conductLimit.value !== right.conductLimit.value) {
              return right.conductLimit.value;
            }
            return undefined;
          })(),
          geoRemoved: (function () {
            if (geoRemoved.length > 0) {
              return geoRemoved;
            }
            return undefined;
          })(),
          excludeUserGroupsRemoved: (function () {
            if (excludeUserGroupsRemoved.length > 0) {
              return excludeUserGroupsRemoved;
            }
            return undefined;
          })(),
          includeUserAgentRegexesRemoved: (function () {
            if (includeUserAgentRegexesRemoved.length > 0) {
              return includeUserAgentRegexesRemoved;
            }
            return undefined;
          })(),
          excludeUserAgentRegexesRemoved: (function () {
            if (excludeUserAgentRegexesRemoved.length > 0) {
              return excludeUserAgentRegexesRemoved;
            }
            return undefined;
          })(),

          languagesRemoved: (function () {
            if (languagesRemoved.length > 0) {
              return languagesRemoved;
            }
            return undefined;
          })(),
          excludeGuidsRemoved: (function () {
            if (excludeGuidsRemoved.length > 0) {
              return excludeGuidsRemoved;
            }
            return undefined;
          })(),
          includeGuidsRemoved: (function () {
            if (includeGuidsRemoved.length > 0) {
              return includeGuidsRemoved;
            }
            return undefined;
          })(),
          metaSiteIdsRemoved: (function () {
            if (metaSiteIdsRemoved.length > 0) {
              return metaSiteIdsRemoved;
            }
            return undefined;
          })(),
          type: (function () {
            if (left.type.value !== right.type.value) {
              return right.type.value;
            } else {
              return undefined;
            }
          })(),

          groups: (function () {
            if (testGroupdifference(left.groups.value, right.groups.value)) {
              return $filter('json')(_.object(_.pluck(right.groups.value, 'value'), _.pluck(right.groups.value, 'chunk')));
            } else {
              return undefined;
            }
          })(),

          startDate: (function () {
            if (left.startDate.value.getTime() !== right.startDate.value.getTime()) {
              return right.startDate.value;
            } else {
              return undefined;
            }
          })(),
          endDate: (function () {
            if (left.endDate.value.getTime() !== right.endDate.value.getTime()) {
              return right.endDate.value;
            } else {
              return undefined;
            }
          })(),
          geoAdded: (function () {
            if (geoAdded.length > 0) {
              return geoAdded;
            }
            return undefined;
          })(),
          excludeUserGroupsAdded: (function () {
            if (excludeUserGroupsAdded.length > 0) {
              return excludeUserGroupsAdded;
            }
            return undefined;
          })(),
          includeUserAgentRegexesAdded: (function () {
            if (includeUserAgentRegexesAdded.length > 0) {
              return includeUserAgentRegexesAdded;
            }
            return undefined;
          })(),
          excludeUserAgentRegexesAdded: (function () {
            if (excludeUserAgentRegexesAdded.length > 0) {
              return excludeUserAgentRegexesAdded;
            }
            return undefined;
          })(),
          languagesAdded: (function () {
            if (languagesAdded.length > 0) {
              return languagesAdded;
            }
            return undefined;
          })(),
          hostsAdded: (function () {
            if (hostsAdded.length > 0) {
              return hostsAdded;
            }
            return undefined;
          })(),
          hostsRemoved: (function () {
            if (hostsRemoved.length > 0) {
              return hostsRemoved;
            }
            return undefined;
          })(),
          includeGuidsAdded: (function () {
            if (includeGuidsAdded.length > 0) {
              return includeGuidsAdded;
            }
            return undefined;
          })(),
          metaSiteIdsAdded: (function () {
            if (metaSiteIdsAdded.length > 0) {
              return metaSiteIdsAdded;
            }
            return undefined;
          })(),
          excludeGuidsAdded: (function () {
            if (excludeGuidsAdded.length > 0) {
              return excludeGuidsAdded;
            }
            return undefined;
          })()
        };
        isDiff = (_.find(_.values(diff), function (e) {
          return e !== undefined;
        }) !== undefined);
        return {
          isDiff: isDiff,
          diff: diff
        };
      }
    };

    return experimentFormService;
  }]);

'use strict';

angular.module('uiPetri')
    .factory('modalWizard', function () {
      return {
        tabs: 0,
        transactions: {},
        current: {},
        onStateChangeCallback: undefined,

        init: function (tabs, transactions, onStateChangeCallback) {
          this.onStateChangeCallback = onStateChangeCallback;
          this.tabs = tabs;
          this.transactions = transactions;
          this.current = tabs[0];
          this.onStateChangeCallback(this.current);
        },

        next: function () {
          var res = this.current.onNext();
          var current = this.current;
          var transaction = _.find(this.transactions, function (e) {
            return (e.tab === current) && (e.result === res);
          });
          this.current = transaction.nextTab;
          transaction.onTransaction();
          this.onStateChangeCallback(this.current);
        },

        prev: function () {
          this.current.onPrev();

          if (this.current.tab !== 0) {
            this.current = this.tabs[this.current.tab - 1];
          }
          this.onStateChangeCallback(this.current);
        }
      };
    });

'use strict';

angular.module('uiPetri')
  .factory('configData', ["clientConfig", function (clientConfig) {
    var config = {
      data: {
        minTime:  clientConfig.production ? 5 : 0,
        modalHeaderError: {class: 'text-error', text: 'Please fill/fix the marked fields '},
        startTimeError: {class: 'text-error', text: 'time should be later then  __time__'},
        endTimeError: {class: 'text-error', text: 'end time should be later then start time'},
        restApiUpdateSuccess: {class: 'text-info', text: 'experiment __id__ saved in server'},
        restApiUpdateNoIdSuccess: {class: 'text-info', text: 'experiment saved in server'},
        restApiUpdateFailed: {class: 'text-error', text: 'update experiment failed!!!'},
        restApiGetExperimentFailed: {class: 'text-error', text: 'read experiment from server, failed!!!'},
        restApiNewSucceeded: {class: 'text-info', text: 'new experiment saved in server'},
        restApiNewFailed: {class: 'text-error', text: 'create new experiment failed!!!'},
        restApiDuplicateFailed: {class: 'text-error', text: 'create new experiment failed!!!'},

        //confirm dialog
        stopTestConfirm: {class: 'text-error', text: '__exp__ will be stopped'},
        stopConfirmButton: {class: 'btn-primary error', text: 'Stop Test'},
        stopCancelButton: {class: 'btn-default', text: 'Keep Test'},

        pauseTestConfirm: {class: 'text-error', text: '__exp__ will be paused '},
        pauseConfirmButton: {class: 'btn-primary error ', text: 'Pause Test'},
        pauseCancelButton: {class: 'btn-default', text: 'Keep Test'},

        terminateSpecConfirmButton: {class: 'btn-primary error ', text: 'Remove Spec'},
        terminateSpecCancelButton: {class: 'btn-default', text: 'Keep Spec'},
        terminateSpecSuccess: {class: 'text-info', text: 'spec removed in server'},
        terminateSpecFailed: {class: 'text-error', text: 'spec removal failed!!!'},

        resumeTestConfirm: {class: 'text-error', text: '__exp__ will be resumed'},
        resumeConfirmButton: {class: 'btn-primary error', text: 'Resume Test'},
        resumeCancelButton: {class: 'btn-default', text: 'Keep Paused'},

        /*known errors*/
        invalidSpec: {class: 'text-error', text: 'Spec not found'},
        invalidSpecConfirmButton: {class: 'btn-warning', text: 'Ok'},
        invalidSpecCancelButton: {class: 'ng-hide', text: ''}
      },

      isDealerScope:  function (scopeName) {
        return scopeName === 'wix-dealer' || scopeName === 'wix-dealer-registered';
      },

      isPublicScope:  function (scopeName) {
        return scopeName === 'publicUrl' || scopeName === 'publicUrlForRegistered' || scopeName === 'template-viewer-groups' || scopeName === 'newsfeed-cms-post' || scopeName === 'adoric-registered' || scopeName === 'adoric-all' || scopeName === 'wix-dealer';
      },
      placeHolderByScope: function (scopeName) {
        if (scopeName === 'publicUrl' || scopeName === 'publicUrlForRegistered') {
          return '<UserName>/<SiteName>';
        }
        if (scopeName === 'template-viewer-groups') {
          return '<fileName>.json';
        }
        return '00000000-0000-0000-0000-000000000000';
      }

    };
    return config;
  }]);


