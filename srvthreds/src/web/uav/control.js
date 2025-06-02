$(function () {
  var socket = io('http://localhost:3000', { transports: ['websocket'], jsonp: false, auth: { token: id } });
  //var socket = io('https://proximl.com', { transports: ['websocket'], jsonp: false, auth: { token: id } });
  var lastThredid;
  function send(message) {
    socket.send(message);
  }
  function sendCurrent(dataId) {
    try {
      const json = JSON.parse($(dataId).val());
      if (!json.thredId) json.thredId = lastThredid;
      send(json);
      $('#spinner').fadeToggle(0.1);
      const timerId = window.setTimeout(() => {
        $('#spinner').fadeToggle();
      }, 1000);
    } catch (e) {
      alert(e);
    }
  }
  $('#image_primary').click(function (e) {
    e.preventDefault(); // prevents page reloading
    sendCurrent('#data');
    return false;
  });
  $('#send_button').click(function (e) {
    e.preventDefault(); // prevents page reloading
    sendCurrent('#data');
    return false;
  });
  $('#send_button2').click(function (e) {
    e.preventDefault(); // prevents page reloading
    sendCurrent('#data2');
    return false;
  });
  $('#showhide').click(function (e) {
    e.preventDefault(); // prevents page reloading
    $('#json_container').fadeToggle();
  });
  $('#open').click(function (e) {
    e.preventDefault(); // prevents page reloading
    $('#popup').fadeToggle();
  });
  $('#close').click(function (e) {
    e.preventDefault(); // prevents page reloading
    $('#popup').fadeToggle();
  });
  socket.on('message', function (msg) {
    lastThredid = msg.thredId;
    const image = msg.data && msg.data.display && msg.data.display.uri;
    if (image) {
      $('#event_image').attr('src', msg.data.display.uri);
    }
    $('#event_from').text(msg.source.name);
    $('#event_thread_id').text('Thread ID: ' + msg.thredId);
    $('#event_data_title').text(msg.data.title);
    $('#event_data_description').text(msg.data.description);
    $('#popup').fadeToggle();
  });
  socket.on('connect', function () {
    console.log(id + 'Connect to server');
  });
  socket.on('connect_error', function () {
    console.log('Connect error');
  });
  socket.on('disconnect', function (reason) {
    console.log(id + 'Disconnected from server: ' + reason);
  });
});
