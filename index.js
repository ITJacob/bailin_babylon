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

var createScene = function () {
  // This creates a basic Babylon Scene object (non-mesh)
  var scene = new BABYLON.Scene(engine);

  var camera1 = new BABYLON.ArcRotateCamera(
    "camera",
    BABYLON.Tools.ToRadians(90),
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

  // Default intensity is 1. Let's dim the light a small amount
  light.intensity = 0.7;

  // Our built-in 'ground' shape.
  var ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 160, height: 160 },
    scene
  );
  let groundMaterial = new BABYLON.StandardMaterial("Ground Material", scene);
  ground.material = groundMaterial;
  let groundTexture = new BABYLON.Texture(
    Assets.textures.checkerboard_basecolor_png.path,
    scene
  );
  groundMaterial.diffuseColor = BABYLON.Color3.Red();
  ground.material.diffuseTexture = groundTexture;

  // add ui
  var camera2 = new BABYLON.ArcRotateCamera(
    "camera",
    BABYLON.Tools.ToRadians(90),
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

var draw = function (scene) {
  var box = BABYLON.MeshBuilder.CreateBox("box", { size: 10 }, scene);
  box.position.x = Math.random() * 100;
  box.position.y = Math.random() * 100;
  box.position.z = 5;

  let boxMaterial = new BABYLON.StandardMaterial("Box Material", scene);
  boxMaterial.diffuseColor = new BABYLON.Color3(
    Math.random(),
    Math.random(),
    Math.random()
  );
  box.material = boxMaterial;
  box.checkCollisions = true;

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

function startGameLoop(isOwner) {
  let x = 0;
  let y = 0;
  const players = {};

  if (isOwner) {
    global.room.onStartFrameSync(() => {
      // 接收帧同步开始通知，处理游戏逻辑
      const frameData = JSON.stringify({ x, y });
      global.room.sendFrame(frameData);
    });
  }

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

    last.frameInfo.forEach(({ playerId, data }) => {
      const _data = JSON.parse(data[0]);
      if (!players[playerId]) {
        players[playerId] = { playerId, box: draw(scene)};
      }
      const player = players[playerId];

      player.box.position.x = _data.x;
      player.box.position.y = _data.y;
    });
  });

  
  // 发送帧数据，房间内玩家可通过该方法向联机对战服务端发送帧数据
  setInterval(() => {
    if (Object.keys(players) === 0) return;
    x += 2;
    y += 2;
    const frameData = JSON.stringify({ x, y });
    global.room.sendFrame(frameData);
  }, 3000);
}

(async function main() {
  await initFunction();
  sceneToRender = scene;

  const { rooms, join } = await start();

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
  } else {
    // 房主
    startGameLoop(true);
  }
})();
