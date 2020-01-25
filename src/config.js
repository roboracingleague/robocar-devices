const config = require('config');
const EventEmitter = require('events');
const mqtt = require('mqtt');

let conf;

class Config extends EventEmitter {
    constructor() {
        super();
        this.overrides = {};
        const client = mqtt.connect(config.get('configServer.mqtt'));
        client.on('connect', () => {
            client.on('message', (topic, payload) => {
                console.log('Received new message', payload.toString());
                try{
                    const newConf = JSON.parse(payload.toString());
                    Object.keys(newConf).forEach(key => this.set(key, newConf[key]));
                } catch(e) {
                    console.error(e);
                }
            });
            client.subscribe(['config']);
        });
        client.on('error', e => {
            console.error('MQTT error', e);
        });
    }
    static getConfig() {
        if (!conf) conf = new Config();
        return conf;
    }
    get(key) {
        const value = this.overrides[key] || config.get(key);
        console.log(`Config.get key "${key}" value "${value}`);
        return value;
    }
    set(key, value) {
        console.log(`Config.set "${key}" value "${value}`);
        this.overrides[key] = value;
        this.emit(key, value);                
    }
}

module.exports = { Config }