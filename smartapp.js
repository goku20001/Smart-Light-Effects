require('dotenv').config();
const SmartApp = require('@smartthings/smartapp');

const MAIN_PAGE_ID = "mainPage"
const WAKE_UP_PAGE_ID = "wakeUp"
const CIRCADIAN_LOOP_PAGE_ID = "circadianLoop"
const LIGHT_BLINK_PAGE_ID = "lightBlink"
const LIGHT_PULSE_PAGE_ID = "lightPulse"

let wakeUpLightIntensity = 0;
let previousPageId = null;
const intervalIds = [];



const initiateLightPulse = async (context, initialIntesity ,finalIntesity, pulseSpeed, currCount, maxCount, interval) => {
  const lightsConfig = context.config.pulseLight;

  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switchLevel",
      command: "setLevel",
      arguments: [finalIntesity,pulseSpeed]
    }
  ])

  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switchLevel",
      command: "setLevel",
      arguments: [initialIntesity,pulseSpeed]
    }
  ])

  currCount.val++;
  if(currCount.val >= maxCount){
    clearInterval(interval)
  }
}


const lightPulseEffect = async context => {

  const lightsConfig = context.config.pulseLight;
  const initialIntesity = parseInt(context.config.pulseInitialIntensity[0].stringConfig.value)
  const finalIntesity = parseInt(context.config.pulseFinalIntensity[0].stringConfig.value)
  const pulseSpeed = parseInt(context.config.pulseSpeed[0].stringConfig.value)
  const maxCount = parseInt(context.config.loopCount[0].stringConfig.value)

  const currCount = {val: 0};

  //Set initial intesity
  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switchLevel",
      command: "setLevel",
      arguments: [initialIntesity]
    }
  ])

  // First turn on the lights if they are turned off
  await turnOnLights(context, lightsConfig);

  
  // Set up an interval to generate pulse effect in a loop
  const interval = setInterval(async () => {
    await initiateLightPulse(context, initialIntesity,finalIntesity, pulseSpeed, currCount, maxCount, interval);
  }, 5000)

  intervalIds.push(interval)
}

const changeWakeUpLightIntensity = async (context, interval) => {
  if(wakeUpLightIntensity > 100){
    clearInterval(interval)
    return
  }

  const lightsConfig = context.config.wakeUpLight;

  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switchLevel",
      command: "setLevel",
      arguments: [wakeUpLightIntensity,10]
    }
  ])

  wakeUpLightIntensity++;

}


// Turns light intesity form [1,100] in duration provided as user input
const wakeUpEffect = async context => {
  const lightsConfig = context.config.wakeUpLight;

  //Turn on the lights and set the intesity to zero
  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switchLevel",
      command: "setLevel",
      arguments: [0]
    },
    {
      capability: "switch",
      command: "on"
    }
  ])

  wakeUpLightIntensity = 1;

  
  const totalDuration = parseInt(context.config.wakeUpDuration[0].stringConfig.value) * 60 * 1000; // milliseconds
  const intervalGap =  totalDuration / 100;

  const interval = setInterval(async () => {
    await changeWakeUpLightIntensity(context, interval);
  }, intervalGap)
  intervalIds.push(interval)

}

const toggleLights = async (context, interval, startTime, totalDuration, turnOn) => {
  const lightsConfig = context.config.blinkLight;

  // If lights were off then turn them on
  if(turnOn.val){
    await turnOnLights(context, lightsConfig)
    turnOn.val = false;
  }

  // If lights were on then turn them off
  else{
    await turnOffLights(context, lightsConfig)
    turnOn.val = true;
  }

  const currTime = Date.now();

  //Stop Condition
  if(currTime - startTime >= totalDuration){
    clearInterval(interval);
  }
}

const turnOnLights = async (context, lightsConfig) => {
  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switch",
      command: "on"
    }
  ])
}

const turnOffLights = async (context, lightsConfig) => {
  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switch",
      command: "off"
    }
  ])
}

const lightBlinkEffect = async context => {
  const lightsConfig = context.config.blinkLight;

  //Turn off all the lights and set intesity to 100
  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switchLevel",
      command: "setLevel",
      arguments: [100]
    },
    {
      capability: "switch",
      command: "off"
    }
  ])

  const totalDuration = parseInt(context.config.blinkDuration[0].stringConfig.value) * 60 * 1000 //milliseconds
  lightBlinkCount = 0;

  const startTime = Date.now();
  const turnOn = {val: true};
  const interval = setInterval(async () => {
    await toggleLights(context, interval, startTime, totalDuration, turnOn);
  }, 2000)
  intervalIds.push(interval)
}


/* Define the SmartApp */
const smartApp = new SmartApp()
  .configureI18n({updateFiles: true})
  .enableEventLogging(2)
  .appId("my-app-id")
  .permissions([
    "r:devices:*",
    "r:locations:*",
    "x:devices:*"
  ])
  .page(MAIN_PAGE_ID, (context, page, configData) => {

    page.section('effects', section => {
      section
        .pageSetting(WAKE_UP_PAGE_ID)
      section
        .pageSetting(CIRCADIAN_LOOP_PAGE_ID)
      section
        .pageSetting(LIGHT_BLINK_PAGE_ID)
      section
        .pageSetting(LIGHT_PULSE_PAGE_ID)
    })
    page.complete('false')

    previousPageId = MAIN_PAGE_ID
    
  })
  .page(WAKE_UP_PAGE_ID, (context, page, configData) => {

    page.section('details', section => {
      section
        .deviceSetting('wakeUpLight')
        .capabilities(['switch', 'switchLevel'])
        .permissions('rx')
        .required(true)
        .multiple(true);
      section
        .numberSetting("wakeUpDuration")
        .min(5)
        .max(60)
        .step(1)
        .style('SLIDER')
        .defaultValue(5)
        .postMessage(' ')

    })
    page.previousPageId('mainPage')
    page.complete('true')

    previousPageId = WAKE_UP_PAGE_ID
    
  })
  .page(CIRCADIAN_LOOP_PAGE_ID, (context, page, configData) => {

    page.section('details', section => {
      
    })
    page.previousPageId('mainPage')
    page.complete('true')

    previousPageId = CIRCADIAN_LOOP_PAGE_ID
    
  })
  .page(LIGHT_BLINK_PAGE_ID, (context, page, configData) => {

    page.section('details', section => {
      section
        .deviceSetting('blinkLight')
        .capabilities(['switch', 'switchLevel'])
        .permissions('rx')
        .required(true)
        .multiple(true);
      section
        .numberSetting("blinkDuration")
        .min(1)
        .max(60)
        .step(1)
        .style('SLIDER')
        .defaultValue(1)
        .postMessage(' ')
    })
    page.previousPageId('mainPage')
    page.complete('true')

    previousPageId = LIGHT_BLINK_PAGE_ID
    
  })
  .page(LIGHT_PULSE_PAGE_ID, (context, page, configData) => {

    page.section('details', section => {
      section
        .deviceSetting('pulseLight')
        .capabilities(['switch', 'switchLevel'])
        .permissions('rx')
        .required(true)
        .multiple(true);
      section
        .numberSetting("pulseInitialIntensity")
        .min(1)
        .max(100)
        .defaultValue(10)
        .required(true)
      section
        .numberSetting("pulseFinalIntensity")
        .min(1)
        .max(100)
        .defaultValue(80)
        .required(true)
      section
        .numberSetting("pulseSpeed")
        .min(1)
        .defaultValue(20)
        .required(true)
      section
        .numberSetting("loopCount")
        .min(1)
        .defaultValue(5)
        .required(true)
    })
    page.previousPageId('mainPage')
    page.complete('true')

    previousPageId = LIGHT_PULSE_PAGE_ID
    
  })
  .updated(async (context, updateData) => {
    // Updated defines what code to run when the SmartApp is installed or the settings are updated by the user.

    // Clear any existing configuration.
    await context.api.schedules.delete()
    await context.api.subscriptions.delete();

    console.log('I am inside update lifecycle event'.yellow);

    switch(previousPageId){
      case WAKE_UP_PAGE_ID:
        await wakeUpEffect(context);
        break;
      case CIRCADIAN_LOOP_PAGE_ID:
        break;
      case LIGHT_BLINK_PAGE_ID:
        await lightBlinkEffect(context);
        break;
      case LIGHT_PULSE_PAGE_ID:
        await lightPulseEffect(context);
        break;
    }

    
  })


  .scheduledEventHandler('test', async (context, event) => {
    
  })

  .uninstalled(async context => {
    //Clear all the intervals set through setInterval()
    intervalIds.forEach(id => clearInterval(id));
    intervalIds.length = 0;
    console.log("Smart App Uninstalled!".yellow);
  })


  module.exports = {
    smartApp
  }