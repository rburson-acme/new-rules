import { Event } from '../../thredlib/index.js';

export class Sms {

    send(event: Event, channelId: string) {
        this.dispatch(channelId);
    }

    dispatch(channelId: string): Promise<any> {
        /*
        const client = twilio(accountSid, authToken);

        return client.messages.create({
                body: '\nGobstopper Assembly 339 has failed with a Widget Jam.\nWould you like to create a work order?\nReply Y/N',
                from: '+12029320316',
                to: channelId
            })
            .then(message => console.log(message.sid));
        */
       return Promise.resolve();
    }
   // mediaUrl: ['https://drive.google.com/file/d/1Ym5A94qhEW7tagIJkymUPlTaFaRKeU1Y/view?usp=sharing'],
}


// From orignial Socker Server ....................

/*
    //@TEMP sms
    const sms: Sms = new Sms();

    // @TEMP sms
    // this should eventually be an external service,
    // using http so that there's no knowlege of sms here
    // @TODO make this an exteranl service using http
    function smsConnect(participantId: string, channelId: string) {
        const sessionId = `${participantId}_${Date.now()}`;
        Logger.debug(`server: an sms user connected ${participantId} : ${channelId}`);
        channels[channelId] = sendSms;
        server.addSession({ id: sessionId }, participantId, channelId).catch((e) => {
            Logger.debug(`server: user ${participantId}::${sessionId} failed to add Session`);
        });
    }

    function send(event: Event, channelId: string) {
        const channel = channels[channelId];
        if(channel) {
            channel(event, channelId);
        } else {
            Logger.debug(`server: channel ${channelId} not found`);
        }
    }

    // @TEMP sms
    function sendSms(event: Event, channelId: string) {
       sms.send(event, channelId); 
    }

    // @TEMP sms
    // smsConnect('bOompa', '+16785235412');

    */

