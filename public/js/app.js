const appPath = `${window.location}`;
const socket = io(appPath);
const client = feathers();

// Create the Feathers application with a `socketio` connection
client.configure(feathers.socketio(socket));

// Get the services for our endpoints
const positions = client.service('positions');
const videoinputs = client.service('videoinputs');
const videomixer = client.service('videomixer');
const cameras = client.service('cameras');
const overlay = client.service('overlay');

$(document).on('click', 'button[name=settings-button]', () => {
  $('.body-under-settings').toggleClass('hidden');
  $('#main-settings').toggleClass('hidden');
});

const camButton = (data) => {
  const call = JSON.stringify({
    command: 'cmd',
    action: data,
    cameraID: document.getElementById('cameraid').value
  });
  $.get(`/movecam/${call}`);
};

const camMenuButton = (button, data) => {
  $(`.${button} button`).click(function(){
    camButton(data);
  });
};

const camArrowButton = (button, data) => {
  $(`[name=${button}]`).bind('mousedown touchstart', function(){
    camButton(data);
  }).bind('mouseup touchend', function(){
    camButton(data.startsWith('zoom') ? 'zoomStop' : 'moveStop');
  });
};

const menuButtons = {
  'power-button'  :   'power',
  'menu-button'   :   'menuToggle',
  'menu-ok'       :   'menuOK',
  'menu-back'     :   'menuBack'
};

$.each(menuButtons, function(button, action) {
  camMenuButton(button, action);
});

const arrowButtons = {
  'up-button'     :   'moveUp',
  'left-button'   :   'moveLeft',
  'right-button'  :   'moveRight',
  'down-button'   :   'moveDown',
  'zoom-tele'     :   'zoomTeleStd',
  'zoom-wide'     :   'zoomWideStd'
};

$.each(arrowButtons, function(button, action) {
  camArrowButton(button, action);
});

function addCameraPosition(position) {
  const camPos = document.querySelector('.memoutput');
  camPos.insertAdjacentHTML('beforeend', `
    <div class="col-xs-6 col-sm-4 col-md-3 col-xl-3">
      <button type="memory-button" value="${position._id}" class="mem-button btn btn-primary">
        <span aria-hidden="true">${position.subjectName}</span>
      </button>
    </div>
  `);
}

positions.find().then(camerabuttons => {
  _.sortBy(camerabuttons.data, ['sortNumber']).forEach(addCameraPosition);
});
positions.on('created', addCameraPosition);

document.getElementById('position-mem').addEventListener('submit', function(ev) {
  ev.preventDefault();
  const call = JSON.stringify({
    command: 'save',
    cameraID: this.cameraid.value,
    subjectName: this.subjectname.value
  });
  $.get(`/movecam/${call}`);

  $('#position-mem').find('input[type=text]').val('');
});

function addMediaSources(media) {
  const mediaSource = document.querySelector('.mediaoutput');
  mediaSource.insertAdjacentHTML('beforeend',`
    <div class="col-sm-4 col-md-4 col-xl-3">
      <button type="media-button" value="${media._id}" class="mem-button btn btn-primary">
        <span aria-hidden="true">${media.sourceName}</span>
      </button>
    </div>
  `);
}

videoinputs.find().then(mediabuttons => {
  mediabuttons.data.forEach(addMediaSources);
});
videoinputs.on('created', addMediaSources);

document.getElementById('add-media').addEventListener('submit', function(ev) {
  ev.preventDefault();

  videoinputs.create({
    sourceName: this.mediainput.value,
    mixerInput: this.mixerinputmedia.value,
  });

  $('#add-media').find('input[type=text]').val('');
});

videomixer.find().then( mixer => {
  if(mixer.total > 0) {
    $('.add-video-mixer').addClass('hidden');
    $('#auxmode').removeClass('hidden');
    $('#auxprogram span').text(mixer.data[0].auxProgram);
    $('#auxsource span').text(mixer.data[0].auxSource);  }
});

document.getElementById('video-mixer').addEventListener('submit', function(ev) {
  ev.preventDefault();
  const auxProgram = this.auxprogram.value;
  const auxSource = this.auxsource.value;

  videomixer.create({
    videomixerIP: this.videomixer.value,
    auxProgram: auxProgram,
    auxSource: auxSource,
  });

  $('#video-mixer').find('input[type=text]').val('');
  $('.add-video-mixer').addClass('hidden');
  $('#auxmode').removeClass('hidden');
  $('#auxprogram span').text(auxProgram);
  $('#auxsource span').text(auxSource);
});

document.getElementById('add-camera').addEventListener('submit', function(ev) {
  ev.preventDefault();
  const cameraName = this.name.value;
  const cameraIP = this.cameraip.value;
  const mixerInput = this.mixerinputcamera.value;

  cameras.create({
    cameraName: cameraName,
    cameraIP: cameraIP,
    mixerInput: mixerInput
  });

  $('#add-camera').find('input[type=text]').val('');
  populateCameraList();
});

function populateCameraList() {
  $('#movecamera option').remove();
  $('#cameraid option').remove();
  cameras.find().then( cameras => {
    _.forEach(cameras.data, camera => {
      $('#movecamera').append(`<option value=${camera._id}>${camera.cameraName}</option>`);
      $('#cameraid').append(`<option value=${camera._id}>${camera.cameraName}</option>`);
    });
  });
}
populateCameraList();

// Initialize aux source selection buttons
$(document).on('click', 'button[type=mixeraux]', function() {
  const call = JSON.stringify({
    mixerAUX: this.value
  });
  $.get(`/mixerinputs/${call}`);
});

// Initialize saved camera position buttons
$(document).on('click', 'button[type=memory-button]', function() {
  const callCam = JSON.stringify({
    command: 'preset',
    positionID: this.value
  });
  $.get(`/movecam/${callCam}`);
  positions.get(this.value).then( (position) => {
    cameras.get(position.cameraID).then( (camera) => {
      const callMixer = JSON.stringify({
        mixerAUX: false,
        mixerInput: camera.mixerInput
      });
      $.get(`/mixerinputs/${callMixer}`);
    });
  });
});

// Initialize media input buttons
$(document).on('click', 'button[type=media-button]', function() {
  videoinputs.get(this.value).then( (media) => {
    const callMixer = JSON.stringify({
      mixerAUX: false,
      mixerInput: media.mixerInput
    });
    $.get(`/mixerinputs/${callMixer}`);
  });
});

$('select[name="cameranumber"]').prop('disabled', true);
$('select[name="sourcetype"]').change(function() {
  if($('select[name="sourcetype"]').val() === 'camera') {
    $('select[name="cameranumber"]').prop('disabled', false);
  } else {
    $('select[name="cameranumber"]').val('');
    $('select[name="cameranumber"]').prop('disabled', true);
  }
});

function addOverlay(camPosId){
  overlay.find({ query :{ positionId : camPosId } }).then( (overlayElements) => {
    var group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", camPosId);
    overlayElements.data.forEach(elementData => {
      var polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.setAttribute("id", elementData.idName);
      polygon.setAttribute("points", elementData.points);
      // polygon.setAttribute("campos-next", elementData.nextPosition);
      polygon.addEventListener('click', function() { changeCamPos(elementData.nextPosition, camPosId) });
      group.appendChild(polygon);
    });
    document.getElementById("overlay").appendChild(group);
    });
}

function changeCamPos(targetPos, currentPos){
  // console.log("AAF!:", targetPos + " " + currentPos);
  if(targetPos !== 'undefined'){
    if(currentPos !== 'undefined'){
      if(document.getElementById(currentPos) && document.getElementById(currentPos).tagName === "g"){
        document.getElementById(currentPos).style.visibility = "hidden";
      }
    }
    if(document.getElementById(targetPos) && document.getElementById(targetPos).tagName === "g"){
      document.getElementById(targetPos).style.visibility = "visible";
    }else{
        addOverlay(targetPos);
    }
  }
}

// Initialize video overlay buttons
$('#camvideo-start').on('click' , function() {
    positions
        .find({  query :{ sortNumber: 0 }  })
            .then((position) => 
    {
    if (!Array.isArray(position.data)) {
      console.error("No default camera position defined! (positions.find did not return array, positions will need one entry with sortNumber 0)");
    } else {
      // console.log("ASDF!!:", position.data[0]._id);
        addOverlay(position.data[0]._id);
    }
  });
});

// see polymaker.js
function polymakerResult(points) {
	alert("New polygon points: " + points);
}

initPolymaker(polymakerResult);
