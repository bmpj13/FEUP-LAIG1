
function XMLscene(myInterface) {
  CGFscene.call(this);

  this.interface = myInterface;
}

XMLscene.prototype = Object.create(CGFscene.prototype);
XMLscene.prototype.constructor = XMLscene;

XMLscene.prototype.init = function (application) {
  CGFscene.prototype.init.call(this, application);

  this.enableTextures(true);

  this.initCameras();

  this.initLights();

  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

  this.gl.clearDepth(100.0);
  this.gl.enable(this.gl.DEPTH_TEST);
  this.gl.enable(this.gl.CULL_FACE);
  this.gl.depthFunc(this.gl.LEQUAL);

  this.axis=new CGFaxis(this);

  this.lightsStatus;
  this.viewIndex=0;
  this.materialIndex=0;

  this.setUpdatePeriod(30);

  this.setPickEnabled(true);

  this.blockade= new Blockade(this);

  this.audio = new Audio();
  this.audio.src = 'resources\\sound\\pina_colada.mp3';
  this.audio.controls=true;
  this.audio.loop=true;
  this.audio.autoplay=true;

  this.currentScene = "Island";
};

XMLscene.prototype.initLights = function () {

  this.lights[0].setPosition(2, 3, 3, 1);
  this.lights[0].setAmbient(0, 0, 0, 1);
  this.lights[0].setDiffuse(1.0, 1.0, 1.0, 1.0);
  this.lights[0].setSpecular(1.0, 1.0, 1.0, 1.0);
  this.lights[0].setVisible(true);
  this.lights[0].enable();
  this.lights[0].update();
};

XMLscene.prototype.initCameras = function () {
  this.camera = new CGFcamera(0.4, 0.1, 500, vec3.fromValues(15, 15, 15), vec3.fromValues(0, 0, 0));
};

XMLscene.prototype.setDefaultAppearance = function () {
  this.setAmbient(0.2, 0.4, 0.8, 1.0);
  this.setDiffuse(0.2, 0.4, 0.8, 1.0);
  this.setSpecular(0.2, 0.4, 0.8, 1.0);
  this.setShininess(10.0);
};

// Handler called when the graph is finally loaded.
// As loading is asynchronous, this may be called already after the application has started the run loop
XMLscene.prototype.onGraphLoaded = function () {
  this.gl.clearColor(this.graph.illumination.background.r,this.graph.illumination.background.g,this.graph.illumination.background.b,this.graph.illumination.background.a);
  this.setGlobalAmbientLight(this.graph.illumination.ambient.r,this.graph.illumination.ambient.g,this.graph.illumination.ambient.b,this.graph.illumination.ambient.a);
  this.lights[0].setVisible(true);
  this.lights[0].enable();
  this.updateView();
  this.initGraphLights();
  this.axis=new CGFaxis(this,this.graph.axis_length, 0.1);
};


XMLscene.prototype.updateView = function () {
    this.camera = this.graph.perspectives[this.viewIndex];
    
    if (this.viewIndex !== 0)
      this.interface.setActiveCamera(this.graph.perspectives[this.viewIndex]);

    this.viewIndex = (++this.viewIndex) % this.graph.perspectives.length;
};

XMLscene.prototype.initGraphLights = function () {
    var index = 0;

    this.lightsStatus= new Array( this.graph.omniLights.length + this.graph.spotLights.length);

    for (var i = 0; i < this.graph.omniLights.length; i++,index++) {
      var omni = this.graph.omniLights[i];

      this.lights[index].setPosition(omni.location.x, omni.location.y, omni.location.z, omni.location.w);
      this.lights[index].setAmbient(omni.ambient.r, omni.ambient.g, omni.ambient.b, omni.ambient.a);
      this.lights[index].setDiffuse(omni.diffuse.r, omni.diffuse.g, omni.diffuse.b, omni.diffuse.a);
      this.lights[index].setSpecular(omni.specular.r, omni.specular.g, omni.specular.b, omni.specular.a);

      this.lightsStatus[index] = omni.enabled;

      if (omni.enabled)
        this.lights[index].enable();
      else
        this.lights[index].disable();

      this.lights[index].setVisible(true);
      this.lights[index].update();
    }



    for (var i = 0; i < this.graph.spotLights.length; i++,index++) {
      var spot = this.graph.spotLights[i];

      this.lights[index].setPosition(spot.location.x, spot.location.y, spot.location.z, 1);
      this.lights[index].setAmbient(spot.ambient.r, spot.ambient.g, spot.ambient.b, spot.ambient.a);
      this.lights[index].setDiffuse(spot.diffuse.r, spot.diffuse.g, spot.diffuse.b, spot.diffuse.a);
      this.lights[index].setSpecular(spot.specular.r, spot.specular.g, spot.specular.b, spot.specular.a);
      this.lights[index].setSpotExponent(spot.exponent);
      this.lights[index].setSpotDirection(spot.direction.x, spot.direction.y, spot.direction.z);

      this.lightsStatus[index] = spot.enabled;

      if (spot.enabled)
        this.lights[index].enable();
      else
        this.lights[index].disable();

      this.lights[index].setVisible(true);
      this.lights[index].update();
    }
};


XMLscene.prototype.updateLights = function () {

  for (var i = 0; i < this.lightsStatus.length; i++) {
    if(this.lightsStatus[i])
      this.lights[i].enable();
    else
      this.lights[i].disable();
  }

  for (var i = 0; i < this.lights.length; i++)
    this.lights[i].update();

}

XMLscene.prototype.updateMaterial = function () {
    this.materialIndex++;
}



XMLscene.prototype.display = function () {
  // ---- BEGIN Background, camera and axis setup
  this.blockade.logPicking();
  // Clear image and depth buffer everytime we update the scene
  this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

  // Initialize Model-View matrix as identity (no transformation
  this.updateProjectionMatrix();
  this.loadIdentity();

  // Apply transformations corresponding to the camera position relative to the origin
  this.applyViewMatrix();

  // Draw axis
  this.axis.display();

  this.setDefaultAppearance();

  // ---- END Background, camera and axis setup

  // it is important that things depending on the proper loading of the graph
  // only get executed after the graph has loaded correctly.
  // This is one possible way to do it


  if (this.graph.loadedOk)
  {

    this.updateLights();


    //jogo
    this.pushMatrix();
    this.blockade.display();
    this.popMatrix();

    if (this.graph.displayGraph())
      return;
  }



};



XMLscene.prototype.update = function(currTime) {
  this.blockade.update(currTime);

  if (this.graph.loadedOk){
    for(var id in this.graph.animations)
      this.graph.animations[id].update(currTime);

    for(id in this.graph.primitives)
      if(this.graph.primitives[id] instanceof Vehicle) {
         this.graph.primitives[id].update(currTime);
      }
  }

};

XMLscene.prototype.handleAudio = function() {
  if(this.audio.paused)
    this.audio.play();
  else
    this.audio.pause();
};




XMLscene.prototype.setGraph = function(filename) {
  this.viewIndex = 0;
  this.graph = new MySceneGraph(filename, this);

  if (filename == "Island.dsx" && this.currentScene != 'Island') {
    this.audio.src = 'resources\\sound\\pina_colada.mp3';
    this.currentScene = 'Island';
  }
  else if (filename == "Space.dsx" && this.currentScene != 'Space') {
    this.audio.src = 'resources\\sound\\space.mp3';
    this.currentScene = 'Space';
  }
  else if (filename == "Studio.dsx" && this.currentScene != 'Studio') {
    this.audio.src = 'resources\\sound\\sotor.mp3';
    this.currentScene = 'Studio';
  }
};
