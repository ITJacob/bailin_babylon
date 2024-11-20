var canvas = document.getElementById("renderCanvas");

var startRenderLoop = function (engine, canvas) {
  engine.runRenderLoop(function () {
    if (sceneToRender && sceneToRender.activeCamera) {
      sceneToRender.render();
    }
  });
};

var engine = null;
var scene = null;
var sceneToRender = null;
var uiPanel = null;

var createDefaultEngine = function () {
  return new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false,
  });
};

let labelTexture = null;

var createScene = function () {
  // This creates a basic Babylon Scene object (non-mesh)
  var scene = new BABYLON.Scene(engine);

  var camera1 = new BABYLON.ArcRotateCamera(
    "camera",
    BABYLON.Tools.ToRadians(-90), // 沿着z轴正向看
    BABYLON.Tools.ToRadians(65),
    160,
    BABYLON.Vector3.Zero(),
    scene
  );
  // This attaches the camera to the canvas
  camera1.attachControl(canvas, false);
  camera1.layerMask = 1;

  // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
  var light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );

  BABYLON.loadAssetContainerAsync("public/sky/skybox.glb", scene).then(
    (res) => {
      console.log(res);
      //Skybox
      const skybox = BABYLON.MeshBuilder.CreateBox(
        "skyBox",
        { size: 500 },
        scene
      );
      const skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
      skyboxMaterial.backFaceCulling = false;
      // skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/skybox", scene);
      skyboxMaterial.reflectionTexture = res.textures[0];
      skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
      skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
      skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      skybox.material = skyboxMaterial;
      skybox.layerMask = 1;
    }
  );

  // Default intensity is 1. Let's dim the light a small amount
  // light.intensity = 0.7;

  // Our built-in 'ground' shape.
  // var ground = BABYLON.MeshBuilder.CreateGround(
  //   "ground",
  //   { width: 160, height: 160 },
  //   scene
  // );
  // ground.layerMask = 1;
  // let groundMaterial = new BABYLON.StandardMaterial("Ground Material", scene);
  // ground.material = groundMaterial;
  // let groundTexture = new BABYLON.Texture(
  //   Assets.textures.checkerboard_basecolor_png.path,
  //   scene
  // );
  // groundMaterial.diffuseColor = BABYLON.Color3.Red();
  // ground.material.diffuseTexture = groundTexture;

  BABYLON.loadAssetContainerAsync("public/ground/scene.gltf", scene).then(
    (res) => {
      console.log(res);
      const env = res.meshes[0];
      env.scaling.x = 30;
      env.scaling.y = 2;
      env.scaling.z = 30;
      let allMeshes = env.getChildMeshes();
      // groundMaterial.diffuseColor = allMeshes[0].material.albedoColor;
      allMeshes.forEach((m) => {
        m.layerMask = 1;
        m.receiveShadows = true;
        m.checkCollisions = true;
        // m.material = groundMaterial;
      });
      res.addAllToScene();
    }
  );
  // BABYLON.appendSceneAsync("public/ground/scene.gltf", scene).then((res) => {
  //   console.log(res);

  // });

  // GUI
  labelTexture =
    BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI for label");
  labelTexture.layer.layerMask = 1;

  // add ui
  var camera2 = new BABYLON.ArcRotateCamera(
    "camera",
    BABYLON.Tools.ToRadians(-90),
    BABYLON.Tools.ToRadians(65),
    160,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera2.layerMask = 2;
  // GUI - simply set advancedTexture layerMask to 2
  var advancedTexture =
    BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  advancedTexture.layer.layerMask = 2;

  var panel = new BABYLON.GUI.StackPanel();
  panel.width = "220px";
  panel.fontSize = "14px";
  panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  advancedTexture.addControl(panel);

  window.uiPanel = panel;
  // Activate both cameras at the same time
  scene.activeCameras = [camera1, camera2];
  return scene;
};

var draw = function (scene, id) {
  var box = BABYLON.MeshBuilder.CreateBox("box", { size: 8 }, scene);
  box.position.y = 4;

  let boxMaterial = new BABYLON.StandardMaterial("Box Material", scene);
  boxMaterial.diffuseColor = new BABYLON.Color3(
    Math.random(),
    Math.random(),
    Math.random()
  );
  box.material = boxMaterial;
  box.checkCollisions = true;
  box.layerMask = 1;

  var rect1 = new BABYLON.GUI.Rectangle();
  rect1.width = "100px";
  rect1.height = "40px";
  rect1.cornerRadius = 12;
  rect1.color = "Orange";
  rect1.thickness = 4;
  rect1.background = "green";
  labelTexture.addControl(rect1);

  var label = new BABYLON.GUI.TextBlock();
  label.text = id;
  rect1.addControl(label);

  rect1.linkWithMesh(box);
  rect1.linkOffsetY = -70;

  return box;
};

window.initFunction = async function () {
  var asyncEngineCreation = async function () {
    try {
      return createDefaultEngine();
    } catch (e) {
      console.log(
        "the available createEngine function failed. Creating the default engine instead"
      );
      return createDefaultEngine();
    }
  };

  window.engine = await asyncEngineCreation();
  if (!engine) throw "engine should not be null.";
  startRenderLoop(engine, canvas);
  window.scene = createScene();
};

// Resize
window.addEventListener("resize", function () {
  engine.resize();
});

function startGameLoop() {
  const players = {};
  const speed = 2; // 玩家移动速度
  const input = { l: false, r: false, f: false, b: false };

  scene.onKeyboardObservable.add((kbInfo) => {
    const value = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
    switch (kbInfo.event.key) {
      case "a":
      case "A":
        input.l = value;
        break;
      case "d":
      case "D":
        input.r = value;

        break;
      case "w":
      case "W":
        input.f = value;

        break;
      case "s":
      case "S":
        input.b = value;

        break;
    }
  });

  global.room.onStartFrameSync(() => {
    // 发送帧数据，房间内玩家可通过该方法向联机对战服务端发送帧数据
    setInterval(() => {
      const frameData = JSON.stringify(input);
      global.room.sendFrame(frameData);
    }, 100);
  });

  // 添加接收帧同步信息回调
  global.room.onRecvFrame((msg) => {
    let last;
    // 处理帧数据msg
    if (Array.isArray(msg)) {
      // 处理补帧数据
      last = msg.pop();
    } else {
      // 处理实时帧数据
      last = msg;
    }
    if (!last.frameInfo) return;

    last.frameInfo.forEach(({ playerId, data, timestamp }) => {
      const _data = JSON.parse(data[0]);
      if (!players[playerId]) {
        players[playerId] = {
          playerId,
          box: draw(scene, playerId.substr(-5)),
          timestamp,
        };
      }
      const player = players[playerId];
      const delt = (timestamp - player.timestamp) / 1000;
      const { l, r, f, b } = _data;
      player.box.position.x += (l ? -1 : r ? 1 : 0) * speed; // x轴朝右
      player.box.position.z += (f ? 1 : b ? -1 : 0) * speed;
    });
  });
}

(async function main() {
  await initFunction();
  sceneToRender = scene;

  const { rooms, join, create } = await start();

  if (rooms) {
    rooms.forEach(({ roomCode }, i) => {
      var roomPanel = BABYLON.GUI.Button.CreateSimpleButton(
        "but" + i,
        roomCode
      );
      roomPanel.height = "40px";
      roomPanel.color = "white";
      roomPanel.textHorizontalAlignment =
        BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      roomPanel.marginTop = "10px";
      roomPanel.onPointerClickObservable.add(function () {
        join(roomCode).then(() => {
          startGameLoop();
        });
      });
      uiPanel.addControl(roomPanel);
    });
  }

  var createPanel = BABYLON.GUI.Button.CreateSimpleButton("but0", "new");
  createPanel.height = "40px";
  createPanel.color = "green";
  createPanel.textHorizontalAlignment =
    BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  createPanel.marginTop = "10px";
  createPanel.onPointerClickObservable.add(function () {
    create().then(() => {
      startGameLoop();
    });
  });
  uiPanel.addControl(createPanel);
})();
