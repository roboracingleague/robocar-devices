const config = require('config');
const EventEmitter = require('events');
const zmq = require('zeromq');
const receiver = new zmq.Subscriber;

let conf;

class Config extends EventEmitter {
    constructor() {
        super();
        this.overrides = {};
        receiver.connect(config.get('configServer.emitter'));
        receiver.subscribe('config');
        receiveMessages().catch(e => console.error('Error receiving configuration messages', e));
    }
    static getConfig() {
        if (!conf) conf = new Config();
        return conf;
    }
    async receiveMessages() {
        for await (const [topic, message] of receiver) {
            console.log('Received new message', message.toString());
            try{
                const newConf = JSON.parse(message.toString());
                Object.keys(newConf).forEach(key => this.set(key, newConf[key]));
            } catch(e) {
                console.error(e);
            }
        }
    }
    get(key) {
        const value = this.overrides[key] || config.get(key);
        console.log(`Config.get key "${key}" value "${value}`);
        return value;
    }
    set(key, value) {
        this.overrides[key] = value;
        this.emit(key, value);                
    }
}

module.exports = { Config }