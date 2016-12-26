'use strict'
var config = require('../config/config');
var log = require("./loghelp");
var redis = require("redis");
function initialclient(param) {
    var option={ host: config.redis.host, port: config.redis.port};
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

exports.setValueTimeOut = function(key, value, timeOut) {
    let client=initialclient();
    client.set(key, value,function (err,reply) {
        // log.info(reply);
    });
    client.expire(key, timeOut);
    client.quit();
};
exports.getValue = function(key) {
    return new Promise(function(resolve, reject) {
        let client=initialclient();
        client.get(key, function(err, reply) {
            if (err)
                reject(err);
            else
                resolve(reply);
            client.quit();
        });
    });
};
exports.del = function(key) {
    return new Promise(function (rs,rj) {
        let client=initialclient();

        client.del(key,function (err,reply) {
            if (err)
                rj(err);
            else
                rs(reply);
            client.quit();
        });
    });
};
//根据正则删除缓存
exports.delRegx = function (key) {
    return new Promise(function (rs, rj) {
        let client = initialclient();
        client.keys(key, function (err, keys) {
            if (err) {
                rj(err);
                client.quit();
            }
            if (keys.length) {
                keys.forEach(function(element) {
                    exports.del(element)
                }, this);
            }
        });
        client.quit();
    });
};
exports.sadd=function (key,value,timeout) {
    let client=initialclient({db:3});
    timeout=timeout||config.redis.expire;
    var array=Array.of(value);
    for(let a of array)
    {
        client.sadd(key,a);
    }
    client.expire(key,timeout);
    client.quit();
};
exports.spop=function (key) {
    return new Promise(function (rs,rj) {
        let client=initialclient({db:3});
        client.spop(key,function (err,reply) {
             if(err)
                 rj(err);
            rs(reply);
            client.quit();
        });

    });
};

exports.switchdb=function (dbnum,cb) {
    return new Promise(function (rs,rj) {
        let client=initialclient();
        client.select(dbnum,function (err,reply) {
            if(err)
              rj(err);
            rs(reply);
            cb&&cb();
            client.quit();
        });
    });
};

exports.keys=function (patern) {

    return new Promise(function (rs,rj) {
        let client=initialclient();
        client.keys(patern,function (err,reply) {
            if(err)
                rj(err);
            rs(reply);
            client.quit();
        });
    });
};

exports.values=function (patern) {
     return new Promise(function (rs,rj) {
         let client=initialclient();
         client.keys(patern,function (err,reply) {
             if(err)
                 rj(err);

            let promises= reply.map(key=>new Promise(function (rs,rj) {
                 client.get(key,function (err,reply) {
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
};

/*example:
* let channel="ryan";
 redis.pubSub.registerHandlers("ryan",msg=> console.log(msg));
 redis.pubSub.subscribe(channel);

 redis.pubSub.publish(channel,"hello from chen");*/
class PubSub
{
    constructor(){
        this.sub=initialclient();
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
