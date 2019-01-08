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

//Initialize video overlay buttons
$('#camvideo-start').on('click' , function() {
    positions.find({ query :{ sortNumber: 0 }  }).then( (position) => {
        if (!Array.isArray(position.data)) {
            console.error("No default camera position defined! (positions.find did not return array, positions will need one entry with sortNumber 0)");
        } else {
            //console.log("ASDF!:", Array.isArray(position), Array.isArray(position.data), position);
            //console.log("ASDF!!:", position.data[0]._id);
            //console.log("ASDF:", overlay);
            overlay.find({ query :{ positionId : position.data[0]._id } }).then( (overlayElements) => {
                //console.log("ASD!F!:", overlayElements);
                overlayElements.data.forEach(elementData => {
                    //console.log("A!SD!F!:", elementData);
                    var polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    polygon.setAttribute("points", elementData.points);
                    polygon.setAttribute("id", elementData.subjectName );
                    document.getElementById("overlay").appendChild(polygon);
                });
            });
        }
      });
    
    var polygon = document.createElement("polygon");	
    polygon.setAttribute("id", overlay );
    polygon.setAttribute("points", "120,100 140,98 190,78 150,38");
    polygon.setAttribute("vector-effect", "non-scaling-stroke");
    /*
            "<polygon points=\"1000,100 140,98 190,78 1110,78\" \r\n" + 
            "	                                	vector-effect=\"non-scaling-stroke\" \r\n" + 
            "	                                	id=\"\"\r\n" + 
            "	                                />");*/
    //$("#overlay").append(polygon);
    document.getElementById("overlay").appendChild(polygon);
    document.getElementById("ob1").onclick = function () {
        document.getElementById("ob1").style.visibility = "hidden";
    }
    document.getElementById("ob2").onclick = function () {
        document.getElementById("ob2").style.visibility = "hidden";
    }
});