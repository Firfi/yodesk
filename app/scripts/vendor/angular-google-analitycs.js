/* global angular, console */

'use strict';

angular.module('angular-google-analytics', [])
  .provider('Analytics', function() {
    var created = false,
      trackRoutes = true,
      accountId,
      trackPrefix = '',
      domainName,
      analyticsJS = false,
      pageEvent = '$routeChangeSuccess',
      cookieConfig = 'auto',
      ecommerce = false,
      enhancedLinkAttribution = false,
      removeRegExp,
      experimentId,
      ignoreFirstPageLoad = false;

    this._logs = [];

    // config methods
    this.setAccount = function(id) {
      accountId = id;
      return true;
    };
    this.trackPages = function(doTrack) {
      trackRoutes = doTrack;
      return true;
    };

    this.trackPrefix = function(prefix) {
      trackPrefix = prefix;
      return true;
    };

    this.setDomainName = function(domain) {
      domainName = domain;
      return true;
    };

    this.useAnalytics = function(val) {
      analyticsJS = !!val;
      return true;
    };

    this.useEnhancedLinkAttribution = function (val) {
      enhancedLinkAttribution = !!val;
      return true;
    };

    this.setPageEvent = function(name) {
      pageEvent = name;
      return true;
    };

    this.setCookieConfig = function (config) {
      cookieConfig = config;
      return true;
    };

    this.useECommerce = function (val) {
      ecommerce = !!val;
      return true;
    };

    this.setRemoveRegExp = function (regex) {
      if (regex instanceof RegExp) {
        removeRegExp = regex;
        return true;
      }
      return false;
    };

    this.setExperimentId = function (id) {
      experimentId = id;
      return true;
    };

    this.ignoreFirstPageLoad = function (val) {
      ignoreFirstPageLoad = !!val;
    };

    // public service
    this.$get = ['$document', '$rootScope', '$location', '$window', function($document, $rootScope, $location, $window) {
      var getUrl = function () {
        var url = $location.path();
        if (removeRegExp) {
          return url.replace(removeRegExp, '');
        }
        return url;
      };

      // private methods
      function _createScriptTag() //noinspection JSValidateTypes
      {
        // inject the google analytics tag
        if (!accountId) return;
        $window._gaq = [];
        $window._gaq.push(['_setAccount', accountId]);
        if (enhancedLinkAttribution) {
          $window._gaq.push(['_require', 'inpage_linkid', '//www.google-analytics.com/plugins/ga/inpage_linkid.js']);
        }
        if (trackRoutes && !ignoreFirstPageLoad) {
          if (removeRegExp) {
            $window._gaq.push(['_trackPageview', getUrl()]);
          } else {
            $window._gaq.push(['_trackPageview']);
          }
        }
        if(domainName) $window._gaq.push(['_setDomainName', domainName]);
        (function() {
          var document = $document[0];
          var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
          ga.src = ('https:' === document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
          var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
        })();
        created = true;
      }
      function _createAnalyticsScriptTag() {
        if (!accountId) {
          return console.warn('No account id set for Analytics.js');
        }

        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments);},i[r].l=1*new Date();a=s.createElement(o),
          m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m);
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

        $window.ga('create', accountId, cookieConfig);

        if (trackRoutes && !ignoreFirstPageLoad) {
          $window.ga('send', 'pageview', getUrl());
        }

        if ($window.ga) {
          if (ecommerce) {
            $window.ga('require', 'ecommerce', 'ecommerce.js');
          }
          if (enhancedLinkAttribution) {
            $window.ga('require', 'linkid', 'linkid.js');
          }
          if (experimentId) {
            var expScript = document.createElement('script'),
              s = document.getElementsByTagName('script')[0];
            expScript.src = "//www.google-analytics.com/cx/api.js?experiment=" + experimentId;
            s.parentNode.insertBefore(expScript, s);
          }

        }

      }
      this._log = function() {
        // for testing
        //console.info('analytics log:', arguments);
        this._logs.push(arguments);
      };
      this._trackPage = function(url) {
        if (trackRoutes && !analyticsJS && $window._gaq) {
          $window._gaq.push(['_trackPageview', trackPrefix + url]);
          this._log('_trackPageview', arguments);
        } else if (trackRoutes && analyticsJS && $window.ga) {
          $window.ga('send', 'pageview', trackPrefix + url);
          this._log('pageview', arguments);
        }
      };
      this._trackEvent = function(category, action, label, value) {
        if (!analyticsJS && $window._gaq) {
          $window._gaq.push(['_trackEvent', category, action, label, value]);
          this._log('trackEvent', arguments);
        } else if ($window.ga) {
          $window.ga('send', 'event', category, action, label, value);
          this._log('event', arguments);
        }

      };

      /**
       * Add transaction
       * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiEcommerce#_gat.GA_Tracker_._addTrans
       * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#addTrans
       * @param transactionId
       * @param affiliation
       * @param total
       * @param tax
       * @param shipping
       * @param city
       * @param state
       * @param country
       * @private
       */
      this._addTrans = function (transactionId, affiliation, total, tax, shipping, city, state, country, currency) {
        if (!analyticsJS && $window._gaq) {
          $window._gaq.push(['_addTrans', transactionId, affiliation, total, tax, shipping, city, state, country]);
          this._log('_addTrans', arguments);
        } else if ($window.ga) {
          if (!ecommerce) {
            console.warn('ecommerce no set. Use AnalyticsProvider.setECommerce(true);');
          } else {
            $window.ga('ecommerce:addTransaction', {
              id: transactionId,
              affiliation: affiliation,
              revenue: total,
              tax: tax,
              shipping: shipping,
              currency: currency || 'USD'
            });
            this._log('ecommerce:addTransaction', arguments);
          }

        }
      };

      /**
       * Add item to transaction
       * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiEcommerce#_gat.GA_Tracker_._addItem
       * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#addItem
       * @param transactionId
       * @param sku
       * @param name
       * @param category
       * @param price
       * @param quantity
       * @private
       */
      this._addItem = function (transactionId, sku, name, category, price, quantity) {
        if (!analyticsJS && $window._gaq) {
          $window._gaq.push(['_addItem', transactionId, sku, name, category, price, quantity]);
          this._log('_addItem', arguments);
        } else if ($window.ga) {
          $window.ga('ecommerce:addItem', {
            id: transactionId,
            name: name,
            sku: sku,
            category: category,
            price: price,
            quantity: quantity
          });
          this._log('ecommerce:addItem', arguments);
        }
      };

      /**
       * Track transaction
       * https://developers.google.com/analytics/devguides/collection/gajs/methods/gaJSApiEcommerce#_gat.GA_Tracker_._trackTrans
       * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#sendingData
       * @private
       */
      this._trackTrans = function () {
        if (!analyticsJS && $window._gaq) {
          $window._gaq.push(['_trackTrans']);
          this._log('_trackTrans', arguments);
        } else if ($window.ga) {
          $window.ga('ecommerce:send');
          this._log('ecommerce:send', arguments);
        }

      };

      /**
       * Clear transaction
       * https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce#clearingData
       *
       * @private
       */
      this._clearTrans = function () {
        if ($window.ga) {
          $window.ga('ecommerce:clear');
          this._log('ecommerce:clear', arguments);
        }
      };

      /**
       * Send custom events
       * https://developers.google.com/analytics/devguides/collection/analyticsjs/user-timings#implementation
       * https://developers.google.com/analytics/devguides/collection/analyticsjs/social-interactions#implementation
       *
       * @param obj
       * @private
       */
      this._send = function (obj) {
        if ($window.ga) {
          $window.ga('send', obj);
          this._log('send', obj);
        }
      };



      // creates the ganalytics tracker
      if (analyticsJS) {
        _createAnalyticsScriptTag();
      } else {
        _createScriptTag();
      }


      var me = this;

      // activates page tracking
      if (trackRoutes) $rootScope.$on(pageEvent, function() {
        me._trackPage(getUrl());
      });

      return {
        _logs: me._logs,
        cookieConfig: cookieConfig,
        ecommerce: ecommerce,
        enhancedLinkAttribution: enhancedLinkAttribution,
        getUrl: getUrl,
        experimentId: experimentId,
        ignoreFirstPageLoad: ignoreFirstPageLoad,
        trackPage: function(url) {
          // add a page event
          me._trackPage(url);
        },
        trackEvent: function(category, action, label, value) {
          // add an action event
          me._trackEvent(category, action, label, value);
        },
        addTrans: function (transactionId, affiliation, total, tax, shipping, city, state, country, currency) {
          me._addTrans(transactionId, affiliation, total, tax, shipping, city, state, country, currency);
        },
        addItem: function (transactionId, sku, name, category, price, quantity) {
          me._addItem(transactionId, sku, name, category, price, quantity);
        },
        trackTrans: function () {
          me._trackTrans();
        },
        clearTrans: function () {
          me._clearTrans();
        },
        send: function (obj) {
          me._send(obj);
        }
      };
    }];

  });

