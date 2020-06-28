const Koa = require('koa');
const {port} = require('./config');
const {setupDB,db} = require('./src/dns');
const bodyParser = require('koa-bodyparser');
const {sendSubRecords} = require('./src/tgoutput');
const router = require('./src/tgrouter');

const app = new Koa();

// first catcher
app.use(firstProcedure);
app.use(bodyParser());
app.use(router.routes());

// Final 404 case
app.use(ctx=>{
    ctx.status = 404;
    ctx.body = '404 Not Found';
})

setupDB();
app.listen(port,'0.0.0.0',console.log('Start to run on http://localhost:'+port));

async function firstProcedure(ctx,next) {
    try {
        let chat_id = 187498424;
        let domain = 'oaak.bid';
        // await sendSubRecords({chat_id,domain});
        await next();
    } catch (err) {
        console.error(err);
        ctx.status = 500;
        ctx.body = err.message;
    }
}