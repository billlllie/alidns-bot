const Router = require('@koa/router');

const { db } = require('./dns');
const { tgToken, tgWhitelist, debug } = require('../config');
const {answerCallback,sendMsg,sendDomainsList,sendSubRecords,addRecord,delRecord} = require('./tgoutput')

const router = new Router();

router.post('/api/alidns/tgbot', async ctx => {
    const { body } = ctx.request;
    if (debug) {
        console.log('Remote IP: ' + ctx.ip);
        console.log('Message from remote: ',body);
    }

    // disconnect
    const msg = body.message || body.edited_message;
    ctx.body = '';

    // start to process query
    const { callback_query } = body;
    if (callback_query) {
        const {id,data} = callback_query;
        const chat_id = callback_query.from.id
        const [action,params] = data.split(' ');
        if (debug) {
            console.log('Callbackblock\n');
            console.log(params);
        }
        

        if (action == 'getSubDomainRecords') {
            let [domain,page,keyword,size] = JSON.parse(params);
            page = parseInt(page);
            size = parseInt(size);
            return sendSubRecords({chat_id,domain,page,keyword,size});
        } else if (action == 'delSub') {
            let [domain,keyword,index] = JSON.parse(params);
            return delRecord({chat_id,domain,keyword,index});
        }
        // return answerCallback(id,data);
        return;
    }

    // check message
    const chat_id = msg && msg.chat && msg.chat.id;
    const text = msg && msg.text && msg.text.trim();
    const username = msg && msg.from && msg.from.username;
    if (!chat_id || !text || !tgWhitelist.includes(username)) return console.warn('Exception happnes');

    if (text.startsWith('/add')) {
        let params = text.replace('/add','').trim().split(' ');
        let [domain,rr,type,value] = params;
        if (debug) console.log(params);
        if (!domain || !rr || !type || !value) {
            return sendMsg({
                chat_id,
                parse_mode: 'HTML',
                text: "Some parameters are missing. Please check your input again."
            });
        } else {
            return addRecord({chat_id,domain,rr,type,value});
        }
    }

    if (text.startsWith('/del')) {
        let params = text.replace('/del','').trim().split(' ');
        let [domain,keyword] = params;
        if (!domain || !keyword) {
            return sendMsg({
                chat_id,
                parse_mode: 'HTML',
                text: "Some parameters are missing. Please check your input again."
            });
        }
        return delRecord({chat_id,domain,keyword});
    }

    if (text.startsWith('/showSub')) {
        let params = text.replace('/showSub','').trim().split(' ');
        let [domain,keyword,page,size] = params;
        page = parseInt(page);
        size = parseInt(size);
        return sendSubRecords({chat_id,domain,page,keyword,size});
    }

    if (text.startsWith('/show')) return sendDomainsList(chat_id);
});

module.exports = router;