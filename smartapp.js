require('dotenv').config();
const SmartApp = require('@smartthings/smartapp');

const MAIN_PAGE_ID = "mainPage"
const WAKE_UP_PAGE_ID = "wakeUp"
const CIRCADIAN_LOOP_PAGE_ID = "circadianLoop"
const LIGHT_BLINK_PAGE_ID = "lightBlink"
const LIGHT_PULSE_PAGE_ID = "lightPulse"

let lightIntensity = 0;
let previousPageId = null;

const changeLightIntensity = async (context, interval) => {
  if(lightIntensity > 100){
    clearInterval(interval)
    return
  }

  const lightsConfig = context.config.wakeUpLight;

  await context.api.devices.sendCommands(lightsConfig, [
    {
      capability: "switchLevel",
      command: "setLevel",
      arguments: [lightIntensity]
    }
  ])

  lightIntensity++;

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

  lightIntensity = 1;

  
  const totalDuration = parseInt(context.config.wakeUpDuration[0].stringConfig.value) * 60 * 1000; // milliseconds
  const intervalGap =  totalDuration / 100;

  const interval = setInterval(async () => {
    await changeLightIntensity(context, interval);
  },intervalGap)


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
          .step(5)
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
      
    })
    page.previousPageId('mainPage')
    page.complete('true')

    previousPageId = LIGHT_BLINK_PAGE_ID
    
  })
  .page(LIGHT_PULSE_PAGE_ID, (context, page, configData) => {

    page.section('details', section => {
      
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
        break;
      case LIGHT_PULSE_PAGE_ID:
        break;
    }

    
  })


  .scheduledEventHandler('test', async (context, event) => {
    
  })

  .uninstalled(async context => {
    lightIntensity = 101;
    console.log("Smart App Uninstalled!".yellow);
  })


  module.exports = {
    smartApp
  }