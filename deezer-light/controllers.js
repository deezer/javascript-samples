/* Vladimir Kosmala @ Deezer, Licence Apache */

var LOGNS = 'APP ::';
var APP_ID = '118825';
var CHANNEL_URL = 'http://vladimir.sh/playground/deezer_light/channel.html';

var angapp = angular.module('app', []);

angapp.config(function($routeProvider) {
	$routeProvider
		.when("/playlists", {
			action: "playlists"
		})
		.when("/playlist/:id", {
			action: "playlist"
		})
		.when("/albums", {
			action: "albums"
		})
		.when("/album/:id", {
			action: "album"
		})
		.when("/artists", {
			action: "artists"
		})
		.when("/artist/:id", {
			action: "artist"
		})
		.when("/favorites", {
			action: "favorites"
		})
		.when("/search/:pattern", {
			action: "search"
		})
		.otherwise({
			redirectTo: "/playlists"
		})
	;
});

angapp.filter('humain_time', function() {
	return function(time) {
		if (time && time > 0.0) {
			var sec = parseInt(time % 60);
			return parseInt(time / 60) + ':' + (sec < 10 ? '0'+sec : sec);
		} else {
			return '0:00';
		}
	};
});

angapp.directive('onKeyupSearch', function() {
	return function(scope, elm, attrs) {
		elm.bind("keyup", function(e) {
			console.log(LOGNS, 'search field: enter pressed');
			scope.trigger_search();
			scope.$apply();
		});
	};
});

angapp.controller("AppController", function($scope, $route, $routeParams, $location, $rootScope) {
	// Init config
	$rootScope.title = 'DZ';
	$scope.logged = false;

	$scope.view = 'loading';
	$scope.albums = [];
	$scope.artists = [];
	$scope.favorites = [];

	$scope.playing = false;
	$scope.time_current = 0.0;
	$scope.time_total = 0.0
	$scope.current_track = null;
	$scope.playing_artist = 'Deezer';
	$scope.playing_artist_link = 'http://www.deezer.com';
	$scope.playing_title = null;
	$scope.playing_album_link = null;
	$scope.playing_cover_src = null;

	// Global for test purpose
	rootScope = $rootScope;
	scope = $scope;

	DZ.init({
		appId: APP_ID,
		channelUrl: CHANNEL_URL,
		player: {

		}
	});

	// --------------------------------------------------- Methods

	$scope.login = function() {
		console.log(LOGNS, 'login clicked');

		DZ.login(function(response) {
			if (response.authResponse) {
				console.log(LOGNS, 'logged');
				$scope.logged();
			} else {
				console.log(LOGNS, 'not logged');
			}
		}, {scope: 'manage_library,basic_access'});
	};

	$scope.logged = function() {
		$scope.logged = true;
		console.log(LOGNS, 'Player loaded');
		$('#controls').css('opacity', 1);
		$scope.handleRoute();
	};

	$scope.trigger_search = function(){
		var search_value = $scope.search_value;
		console.log(LOGNS, 'Search for', search_value);

		if (search_value) {
			$location.path("/search/"+search_value);
		} else {
			if ($scope.last_path) {
				$location.path($scope.last_path);
			} else {
				$location.path('/');
			}
		}
	};

	$scope.play_track = function(index) {
		DZ.player.playTracks($scope.tracks_ids, index, function(response){
			console.log(LOGNS, "track list", response.tracks);
		});
	};

	$scope.play_track_id = function(id) {
		DZ.player.playTracks([id], 0, function(response){
			console.log(LOGNS, "track list", response.tracks);
		});
	};

	$scope.play = function() {
		console.log(LOGNS, 'play clicked');
		DZ.player.play();
	};

	$scope.pause = function() {
		console.log(LOGNS, 'pause clicked');
		DZ.player.pause();
	};

	$scope.previous = function() {
		console.log(LOGNS, 'previous clicked');
		DZ.player.previous();
	};

	$scope.next = function() {
		console.log(LOGNS, 'next clicked');
		DZ.player.next();
	};

	// --------------------------------------------------- Angular events

	$scope.$watch('search_value', function(search_value, oldValue) {
		if (search_value !== oldValue) {
			console.log(LOGNS, 'watch search_value', search_value, oldValue);
			$scope.trigger_search();
		}
	});

	$scope.$on("$routeChangeSuccess", function($currentRoute, $previousRoute) {
		if ($scope.logged) {
			if ($route.current.action !== 'search') {
				$scope.last_path = $location.path(); // when empty search go to this
			}

			$scope.handleRoute();
		}
	});

	$scope.sliderClicked = function(e) {
		var slider = $(e.delegateTarget);
		var x = e.clientX - slider.offset().left;
		var xMax = slider.width();
		console.log(LOGNS, e.clientX, slider.offset().left, e);
		console.log(LOGNS, x / xMax * 100);
		DZ.player.seek(x / xMax * 100);
	};

	// --------------------------------------------------- DZ events

	DZ.Event.subscribe('player_loaded', function(){
		console.log(LOGNS, 'check login...');

		DZ.getLoginStatus(function(response) {
			if (response.authResponse) {
				console.log(LOGNS, 'check login: logged');
				$scope.logged();
			} else {
				console.log(LOGNS, 'check login: not logged');
				$scope.view = 'login';
			}
			$scope.$apply();
		}, {scope: 'manage_library,basic_access'});
	});

	DZ.Event.subscribe('player_play', function(e){
		console.log(LOGNS, "player_play");
		$scope.playing = true;
		$scope.$apply();
	});

	DZ.Event.subscribe('player_paused', function(e){
		console.log(LOGNS, "player_paused");
		$scope.playing = false;
		$scope.$apply();
	});

	DZ.Event.subscribe('player_position', function(e){
		//flood console.log(LOGNS, "Player position", e);
		$scope.time_current = e[0];
		if (e[1]) $scope.time_total = +e[1];
		$scope.$apply();
	});

	DZ.Event.subscribe('current_track', function(e){
		console.log(LOGNS, "current_track", e);

		$scope.playing_artist = e.track.artist.name;
		$scope.playing_artist_link = '#/artist/'+e.track.artist.id;
		$scope.playing_title = e.track.title;
		$scope.playing_album_link = '#/album/'+e.track.album.id;
		$scope.$apply();

		DZ.api('/track/' + e.track.id, function(response){
			console.log(LOGNS, response.album.cover);
			$scope.playing_cover_src = response.album.cover;
			$scope.$apply();
		});
	});

	// --------------------------------------------------- Handle routes

	$scope.handleRoute = function() {
		var renderAction = $route.current.action;
		console.log(LOGNS, 'handleRoute', renderAction);
		console.log(LOGNS, 'width params', $routeParams);

		switch (renderAction) {
			case 'playlists':
				DZ.api('/user/me/playlists', function(response){
					console.log(LOGNS, 'playlists', response.data);
					$scope.playlists = response.data;
					$scope.view = renderAction;
					$rootScope.title = 'Playlists';
					$scope.$apply();

					$('img').on('load', function(){
						console.log(LOGNS, this);
						$(this).css('opacity', 1);
					});
				});
				break;
			case 'playlist':
				DZ.api('/playlist/' + encodeURIComponent($routeParams.id), function(response){
					console.log(LOGNS, 'playlist', $routeParams.id, response);

					var tracks = response.tracks.data;
					var tracks_ids = [];
					for (var prop in tracks) {
						tracks_ids.push(tracks[prop].id);
					}
					$scope.tracks_ids = tracks_ids;

					$scope.playlist = response;
					$scope.view = renderAction;
					$rootScope.title = response.title;
					$scope.$apply();
				});
				break;

			case 'albums':
				DZ.api('/user/me/albums', function(response){
					console.log(LOGNS, 'albums', response.data);
					$scope.albums = response.data;
					$scope.view = renderAction;
					$rootScope.title = 'Albums';
					$scope.$apply();

					$('img').on('load', function(){
						console.log(LOGNS, this);
						$(this).css('opacity', 1);
					});
				});
				break;
			case 'album':
				DZ.api('/album/' + encodeURIComponent($routeParams.id), function(response){
					console.log(LOGNS, 'album', $routeParams.id, response);
					var tracks = response.tracks.data;
					var tracks_ids = [];
					for (var prop in tracks) {
						tracks_ids.push(tracks[prop].id);
					}
					$scope.tracks_ids = tracks_ids;
					$scope.album = response;
					$scope.view = renderAction;
					$rootScope.title = response.title;
					$scope.$apply();
				});
				break;

			case 'artists':
				DZ.api('/user/me/artists', function(response){
					console.log(LOGNS, 'artists', response.data);
					$scope.artists = response.data;
					$scope.view = renderAction;
					$rootScope.title = 'Artists';
					$scope.$apply();

					$('img').on('load', function(){
						console.log(LOGNS, this);
						$(this).css('opacity', 1);
					});
				});
				break;
			case 'artist':
				DZ.api('/artist/' + encodeURIComponent($routeParams.id), function(response){
					console.log(LOGNS, 'artist', $routeParams.id, response);
					$scope.artist = response;
					$scope.view = renderAction;
					$rootScope.title = response.name;
					$scope.$apply();

					DZ.api('/artist/' + $routeParams.id + '/albums', function(response){
						console.log(LOGNS, 'artist albums', response.data);
						$scope.albums = response.data;
						$scope.view = renderAction;
						$scope.$apply();

						$('img').on('load', function(){
							console.log(LOGNS, this);
							$(this).css('opacity', 1);
						});
					});
				});
				break;

			case 'favorites':
				DZ.api('/user/me/tracks', function(response){
					console.log(LOGNS, 'favorites', response.data);
					var tracks_ids = [];
					for (var i=0, track; track=response.data[i]; i++) {
						tracks_ids.push(track.id);
					}
					$scope.favorites = response.data;
					$scope.tracks_ids = tracks_ids;
					$scope.view = renderAction;
					$rootScope.title = 'Favorites';
					$scope.$apply();
				});
				break;

			case 'search':
				var search_value = $scope.search_value = $routeParams.pattern;

				DZ.api('/search?q=' + encodeURIComponent(search_value), function(response){
					console.log(LOGNS, 'search tracks', response.data);
					$scope.search_tracks = response.data.slice(0, 10);
					$scope.view = 'search';
					$scope.$apply();
				});

				DZ.api('/search/album?q=' + encodeURIComponent(search_value), function(response){
					console.log(LOGNS, 'search album', response.data);
					$scope.search_albums = response.data.slice(0, 10);
					$scope.view = 'search';
					$scope.$apply();
				});

				DZ.api('/search/artist?q=' + encodeURIComponent(search_value), function(response){
					console.log(LOGNS, 'search artist', response.data);
					$scope.search_artists = response.data.slice(0, 10);
					$scope.view = 'search';
					$scope.$apply();
				});

				$scope.view = 'loading';
				$rootScope.title = 'Search: ' + search_value;
				$scope.$apply();
				break;

			default:
				return;
		}

		$scope.view = 'loading';
	};
});
