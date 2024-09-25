
export class DurableTimer {

    // This timer can persisted and safely resumed

    private startTime: number = 0;
    private timeoutId: any;
    private hasFinished = false;
    private duration = 0;
    private finished: ()=>void = ()=>{}; 

    start(duration: number, finished: ()=>void) {
        this.duration = duration;
        this.finished = finished;
        if(this.timeoutId) clearTimeout(this.timeoutId);
        this.hasFinished = false;
        this.startTime = Date.now(); 
        const finish = () => {
            this.hasFinished = true;
            finished();
        }
        this.timeoutId = setTimeout(finish, duration);
    }

    resume() {
        if(!this.hasFinished && this.startTime) {
            if(this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            const finish = () => {
                this.hasFinished = true;
                this.finished();
            }
            // run for the remaing time
            const remainingDuration = this.duration - (Date.now() - this.startTime);
            this.timeoutId = setTimeout(finish, remainingDuration);
        }
    }

    stop() {
        this.startTime = 0;
        this.hasFinished = false;
        if(this.timeoutId) clearTimeout(this.timeoutId);
    }
}