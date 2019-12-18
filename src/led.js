const Gpio = require('pigpio').Gpio;

class LedDisplay {
    constructor(config) {
        this.config = config;
        this.redGpio = new Gpio(this.config.redPin, {mode: Gpio.OUTPUT});
        this.greenGpio = new Gpio(this.config.greenPin, {mode: Gpio.OUTPUT});
        this.blueGpio = new Gpio(this.config.bluePin, {mode: Gpio.OUTPUT});
        
        this.allOff();
    }
    update(mode, throttle) {
        let out;
        switch(mode) {
            case 'user': 
                out = this.greenGpio;
                this.blueGpio.digitalWrite(0);
                this.redGpio.digitalWrite(0);
                break;
            case 'local_angle': 
                out = this.blueGpio;
                this.greenGpio.digitalWrite(0);
                this.redGpio.digitalWrite(0);
                break;
            case 'local':
                out = this.redGpio;
                this.blueGpio.digitalWrite(0);
                this.greenGpio.digitalWrite(0);
                break;
        }
        if (Math.abs(throttle) > 0.2) {
            out.digitalWrite(1 - out.digitalRead());
        } else {
            out.digitalWrite(1);
        }
    }
    allOff() {
        this.redGpio.digitalWrite(0);
        this.greenGpio.digitalWrite(0);
        this.blueGpio.digitalWrite(0);
    }
}

module.exports = { LedDisplay };