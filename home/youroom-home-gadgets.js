$(document).ready(function() {
  function showOneSection(toshow) {
    $('#main, #approval, #waiting').hide();
    $('#' + toshow).show();
  }

  function showEachResult(entry, main) {
    main.haml([".root.entry"+"#"+entry["id"],
               ["%img.profile", {src:getPictureUrl(entry, entry["participation"]["group"]["to_param"]), width:48, height:48}],
               [".name", entry["participation"]["name"]],
               [".group", {data:entry["participation"]["group"]["to_param"]}, entry["participation"]["group"]["name"]],
               [".content", entry["content"]],
               [".clear_left"],
               [".navi",
                [".show.link", "Show"],
                [".comment.link", "Comment"],
                [".clear_left"]
               ],
               ["%form.comment", {action: "#"},
                ["%textarea", {name: "content"}],
                ["%input.comment", {type: "button", value: "Post"}]
               ],
               [".children"]
              ]);
  }

  function getPictureUrl(entry, groupId) {
    return "https://www.youroom.in/r/" + groupId + "/participations/" + entry["participation"]["id"] + "/picture";
  }

  function showResults(result) {
    showOneSection('main');
    var $main = $("#main");

    for(var i = 0; i < result.length; i++) {
      var entry = result[i];
      showEachResult(entry["entry"], $main);
    }

    gadgets.window.adjustHeight();
  }

  function getHomeEntries() {
    var url = "https://www.youroom.in/?format=json";

    callYouRoom(url, "get", function (result) {
        showResults(result);
        showOneSection('main');
      }
    );
  }

  function callYouRoom(url, method, successCallback, postdata){
    var params = {};

    params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.JSON;
    params[gadgets.io.RequestParameters.AUTHORIZATION] = gadgets.io.AuthorizationType.OAUTH;
    params[gadgets.io.RequestParameters.OAUTH_SERVICE_NAME] = "youroom";
    params[gadgets.io.RequestParameters.OAUTH_USE_TOKEN] = "always";

    if (method == "post") {
      params[gadgets.io.RequestParameters.METHOD] = gadgets.io.MethodType.POST;
    } else {
      params[gadgets.io.RequestParameters.METHOD] = gadgets.io.MethodType.GET;
    }

    if (postdata != null) {
      postdata = gadgets.io.encodeValues(postdata);
      params[gadgets.io.RequestParameters.POST_DATA]= postdata;
    }

    gadgets.io.makeRequest(url, function (response) {
      if (response.oauthApprovalUrl) {
        var popup = shindig.oauth.popup({
          destination: response.oauthApprovalUrl,
          windowOptions: null,
          onOpen: function() { showOneSection('waiting'); },
          onClose: function() { getHomeEntries(); }
        });
        var personalize = document.getElementById('personalize');
        personalize.onclick = popup.createOpenerOnClick();
        var approvaldone = document.getElementById('approvaldone');
        approvaldone.onclick = popup.createApprovedOnClick();
        showOneSection('approval');
      } else if (response.data) {
        showOneSection('main');
        successCallback(response.data);
      } else {
        var main = document.getElementById('main');
        var err = document.createTextNode('OAuth error: ' +
          response.oauthError + ': ' + response.oauthErrorText);
        main.appendChild(err);
        showOneSection('main');
      }
    }, params);
  }

  getHomeEntries();

  $(".link.show").live('click', function() {
    var entry = $(this).parents(".root.entry")[0];
    var entryId = entry.id;
    var groupId = $(this).parents(".root.entry").find('.group')[0].attributes[0].value;
    var url = "https://www.youroom.in/r/" + groupId + "/entries/" + entryId + ".json";
    $(this).addClass('disable').removeClass('show').append("<img src='http://github.com/mataki/youRoom-gadgets/raw/master/home/bouncing_ball.gif' class='loading'>");

    callYouRoom(url, "get", function(result) {
      $(entry).find('.children').empty().haml(getChildrenHaml(result.entry, groupId));
      $('.loading').hide();
      gadgets.window.adjustHeight();
    });
  });

  function getChildrenHaml(entry, groupId) {
    if (entry.children) {
      var childrenHaml = [];
      $.each(entry.children, function(){
        var childHaml = getEntryHaml(this, groupId);
        childrenHaml.push(childHaml);
      });
      return childrenHaml;
    }
    return null;
  }

  function getEntryHaml(entry, groupId) {
    var haml;
    var groupParam;
    if (groupId) {
      groupParam = {to_param: groupId};
    } else {
      groupParam = entry["participation"]["group"];
    }

    haml = [".entry"+"#"+entry["id"],
            ["%img.profile", {src:getPictureUrl(entry, groupParam.to_param), width:48, height:48}],
            [".name", entry["participation"]["name"]],
            [".group"],
            [".content", entry["content"]],
            [".clear_left"],
            [".navi",
             [".comment.link", "Comment"],
             [".clear_left"]
            ],
            ["%form.comment", {action: "#"},
             ["%textarea", {name: "content"}],
             ["%input.comment", {type: "button", value: "Post"}]
            ]
           ];
    haml.push([".children", getChildrenHaml(entry, groupId)]);
    return haml;
  }

  $(".link.comment").live('click', function(){
    var entry = $(this).parents('.navi').next('form.comment').toggle();
    gadgets.window.adjustHeight();
  });

  $("input.comment").live('click', function(){
    var $form = $(this).parents('form:first');
    var content = $form.find('textarea').val();
    if (content != "") {
      var entryId = $form.parents(".entry")[0].id;
      var groupId = $form.parents(".root.entry").find('.group')[0].attributes[0].value;
      $(this).after("<img src='http://github.com/mataki/youRoom-gadgets/raw/master/home/bouncing_ball.gif' class='loading'>");
      postEntry(content, groupId, entryId);
    } else {
      alert("Input content");
    }
    return false;
  });

  function postEntry(content, groupId, parentId) {
    var url = "https://www.youroom.in/r/" + groupId + "/entries.json";
    callYouRoom(url, "post", addComment, {"entry[content]":content, "entry[parent_id]": parentId});
  }

  function addComment(result){
    var parent_id = result.entry.parent_id;
    $(".entry#"+parent_id).find("form").hide().end()
      .find(".children:first").haml(getEntryHaml(result.entry)).end()
      .find('form.comment textarea').val('');
    $('.loading').hide();
  }
});
