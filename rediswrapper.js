'use strict'
import  config from '../config/config';
var log = require("./loghelp");
var redis = require("redis");
function initialClient(param) {
    let option={ host: config.redis.host, port: config.redis.port};
    if(param)
    {
        option=Object.assign(option,param);
    }

    let client = redis.createClient(option);
    client.on("error", function(err) {
        log.error(err);
    });
    return client;
}
class DaisyCache
{
    constructor(param)
    {
        this.client = initialClient(param);
    }

    setValueTimeOut(key,value,timeOut)
    {
        return new Promise((rs,rj)=>{
                let self=this.client;
        this.client.set(key, value,function (err,reply) {
            if(timeOut)
            {
                self.expire(key, timeOut,function (err,reply) {
                    rs(reply);
                });
            }
            else
                rs();
        });
    });
    }

    getValue(key)
    {
        return new Promise( (resolve, reject)=>{
                this.client.get(key, function(err, reply) {
                if (err)
                    reject(err);
                else
                    resolve(reply);

            });
    });
    }

    del(key)
    {
        return new Promise( (rs,rj)=> {

                this.client.del(key,function (err,reply) {
                if (err)
                    rj(err);
                else
                    rs(reply);

            });
    });
    }

    delRegx(key)
    {
        return new Promise(  (rs, rj) =>{
                this.client.keys(key, function (err, keys) {
                if (err) {
                    rj(err);
                }
                if (keys.length>0) {
                    keys.forEach(function(element) {
                        exports.del(element)
                    }, this);
                }
            });
    });
    }

    setAdd(key,value,timeout)
    {
        var array=Array.of(value);
        for(let a of array)
        {
            client.sadd(key,a);
        }
        client.expire(key,timeout);
    }
    setPop(key)
    {
        return new Promise((rs,rj)=> {

                this.client.spop(key,function (err,reply) {
                if(err)
                    rj(err);
                rs(reply);
            });

    });
    }

    switchdb(dbnum)
    {
        return new Promise(  (rs,rj)=>{

                this.client.select(dbnum,function (err,reply) {
                if(err)
                    rj(err);
                rs(reply);
            });
    });
    }
    keys()
    {
        return new Promise( (rs,rj)=>{
                this.client.keys(patern,function (err,reply) {
                if(err)
                    rj(err);
                rs(reply);
            });
    });
    }
    batchGet(partern)
    {
        return new Promise( (rs,rj)=> {

                this.client.keys(patern, (err,reply)=> {
                if(err)
                rj(err);

        let promises= reply.map(key=>new Promise( (rs,rj)=> {
                this.client.get(key,function (err,reply) {
                rs(reply);
            });
    }));
        Promise.all(promises).then(d=>{
            rs(d);
        client.quit();
    }).catch(err=>
    rj(err));
    });
    });
    }
}


/*example:
 * let channel="ryan";
 redis.pubSub.registerHandlers("ryan",msg=> console.log(msg));
 redis.pubSub.subscribe(channel);

 redis.pubSub.publish(channel,"hello from chen");*/
class PubSub
{
    constructor(param){
        this.sub=initialClient(param);
        this.handlers=new Map();
        this.subAction=(channle,message)=>{
            let actions= this.handlers.get(channle)||new Set();
            for(let action of actions)
            {
                action(message);
            }
        }
        this.alredyPublishs=[];
        this.subConnected=false;
    }

    publish(channel,message)
    {
        let action=()=>{
        let pub=initialclient();
        pub.publish(channel,message);
    };
        if(this.subConnected===false)
        {
            this.alredyPublishs.push(action);
        }
        else
            action();
    }
    registerHandlers(channel,action)
    {
        var actions=this.handlers.get(channel)||new Set();
        actions.add(action);
        this.handlers.set(channel,actions);
    }
    subscribe(channel)
    {
        let self=this;
        this.sub.subscribe(channel,function (err,reply) {
            if(err)
                log.error(err);
            self.subConnected=true;
            for(let publish of self.alredyPublishs)
                publish();
            console.log(reply);
        });

        this.sub.on("message", function (channel, message) {
            self.subAction(channel,message);
        });
    }

    tearDown()
    {
        this.sub.quit();
    }
}
exports.pubSub=new PubSub();
exports.daisyCache=new DaisyCache();
