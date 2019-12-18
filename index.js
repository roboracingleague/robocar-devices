const Gpio = require('pigpio').Gpio;
const { RemoteChannel, RemoteSwitchChannel } = require('@nitescuc/rccar-remote-reader');
const { Actuator } = require('@nitescuc/rccar-actuator');
const { Config } = require('./src/config');
const { LedDisplay } = require('./src/led');
const dgram = require('dgram');

const config = Config.getConfig();

const REMOTE_STEERING_PIN = config.get('hardware.REMOTE_STEERING_PIN');
const REMOTE_THROTTLE_PIN = config.get('hardware.REMOTE_THROTTLE_PIN');
const REMOTE_MODE_PIN = config.get('hardware.REMOTE_MODE_PIN');

const ACTUATOR_STEERING = config.get('hardware.ACTUATOR_STEERING');
const ACTUATOR_THROTTLE = config.get('hardware.ACTUATOR_THROTTLE');

let mode = 'user';

const remoteSocket = dgram.createSocket('udp4');
const remote_server_port = config.get('remote.server_port');
const remote_server_addr = config.get('remote.server_address');

const ledDisplay = new LedDisplay({
    redPin: config.get('hardware.LED_RED'),
    greenPin: config.get('hardware.LED_GREEN'),
    bluePin: config.get('hardware.LED_BLUE')
});

const actuatorSteering = new Actuator({
    pin: ACTUATOR_STEERING,
    remapValues: [1000, 2000],
    trim: config.get('actuator.trim')
});
const actuatorThrottle = new Actuator({
    pin: ACTUATOR_THROTTLE,
    remapValues: [config.get('actuator.min_pulse'), config.get('actuator.max_pulse')]
});

const setSteeringFromRemote = (value) => {
    if (mode === 'user') {
        actuatorSteering.setValue(value);
        remoteSocket.send(`st;${parseFloat(value).toFixed(4)}`, remote_server_port, remote_server_addr, err => {
            if(err) console.error(err);
        });
    }
    if (!REMOTE_MODE_PIN && (Math.abs(value) > 0.5)) {
        changeMode(value > 0);
    }
}
const setSteeringFromMessage = (value) => {
    if (mode !== 'user') {
        actuatorSteering.setValue(value);
    }
}
const setThrottleFromRemote = (value) => {
    if (mode !== 'local') {
        actuatorThrottle.setValue(value);
        remoteSocket.send(`th;${parseFloat(value).toFixed(4)}`, remote_server_port, remote_server_addr, err => {
            if (err) console.error(err);
        });
    }
}
const changeMode = value => {
    if (mode !== 'user') {
        if (value) {
            mode = 'local';
        } else {
            mode = 'local_angle';
            setThrottleFromRemote(0);
        }
    }
    remoteSocket.send(`md;${mode}`, remote_server_port, remote_server_addr, err => {
        if (err) console.error(err);
    });
}
const setThrottleFromMessage = (value) => {
    if (mode === 'local') {
        actuatorThrottle.setValue(value);
    }
}
const setMode = (value) => {
    if ((value === 'local_angle' || value === 'local') && mode === 'user') {
        mode = 'local_angle';
    }
    if (mode !== 'user' && value === 'user') {
        mode = 'user';
    }
}

const remoteSteering = new RemoteChannel({
    pin: REMOTE_STEERING_PIN,
    remapValues: [-1, 1],
    sensitivity: 0.015,
    callback: (channel, value) => {
        setSteeringFromRemote(value);
    }
});
const remoteThrottle = new RemoteChannel({
    pin: REMOTE_THROTTLE_PIN,
    remapValues: [-1, 1],
    sensitivity: 0.015,
    callback: (channel, value) => {
        setThrottleFromRemote(value);
    }
});
if (REMOTE_MODE_PIN) {
    const remoteMode = new RemoteSwitchChannel({
        pin: REMOTE_MODE_PIN,
        remapValues: [false, true],
        callback: (channel, value) => {
            changeMode(value);
        }
    });
}


const actuatorServer = dgram.createSocket('udp4');
actuatorServer.on('listening', () => {
    const address = actuatorServer.address();
    console.log(`actuatorServer listening ${address.address}:${address.port}`);
});
actuatorServer.on('error', (err) => {
    console.log(`actuatorServer error:\n${err.stack}`);
    actuatorServer.close();
});
actuatorServer.on('message', (msg, rinfo) => {
    const parts = msg.toString().split(';');
    parts[0] && setSteeringFromMessage(parseFloat(parts[0]));
    parts[1] && setThrottleFromMessage(parseFloat(parts[1]));
    parts[2] && setMode(parts[2]);
});
actuatorServer.bind(config.get('actuator.server_port'));

config.on('min_pulse', value => actuatorThrottle.setRemapMinValue(value));
config.on('max_pulse', value => actuatorThrottle.setRemapMaxValue(value));
config.on('actuator_trim', value => actuatorSteering.setTrimValue(value));

const updateLed = () => {
    ledDisplay.update(mode, actuatorThrottle.getValue());
}
setInterval(updateLed, 1000);