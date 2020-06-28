const Table = require('cli-table3');
const axios = require('axios');
const axins = axios.create();
const {getDomainList,getSubDomainRecords,addDomainRecord,deleteDomainRecord,lookupRRId} = require('./dns');

const {tgToken,debug} = require('../config')

module.exports = {
    sendDomainsList,
    sendSubRecords,
    answerCallback,
    sendMsg,
    addRecord,
    delRecord
}

async function answerCallback({id,data}) {
    // const url = `https://api.telegram.org/bot${tgToken}/answerCallbackQuery`;
    // return axins.post(url, {
    //     callback_query_id: id,
    //     text: 'Test '+ data
    // });
}

async function addRecord({chat_id,domain,rr,type,value}) {
    let str;
    try {
        if (await addDomainRecord(domain,rr,type,value)) {
            str = "Add operation succeeded.";
        } else {
            str = "Add operation failed.";
        }
    } catch(err) {
        return sendMsg({
            chat_id,
            text: err.message
        })
    }

    return sendMsg({
        chat_id,
        parse_mode: 'HTML',
        text: `\n<pre>${str}</pre>\n`
    });
}

async function delRecord({chat_id,domain,keyword,index}) {
    let records = [];
    let str = '';
    let inline_keyboard = [[]];
    
    if (index == 0 || index) {
        if(await deleteDomainRecord(domain,keyword,index)) {
            str += '\n\nDelete operation succeeded.';
        }
    }

    try {
        records = await lookupRRId(domain,keyword);
        records = records.DomainRecords.Record;
    } catch(e) {
        return sendMsg({
            chat_id,
            text: e
        })
    }

    let table = new Table({style:{head:[],border:[]}});
    const headers = ['Domain','Record','Type','Value','Status'];
    table.push(headers);

    records.forEach((elem,index)=>{
        let status = elem.Status=='ENABLE'?'√':'×';
        let row = [domain,elem.RR,elem.Type,elem.Value,status];
        table.push(row);
        inline_keyboard[0].push({
            text: `${index+1}. ${elem.RR}.${domain}`,
            callback_data:`delSub ["${domain}","${keyword}",${index}]`})
    });

    str = table.toString().replace(/─/g, '—');

    if (records.length == 0) {
        str += '\n\nNo record found';
    }

    
    return sendMsg({
        chat_id,
        parse_mode: 'HTML',
        text: `\n<pre>${str}</pre>`,
        reply_markup: {
            inline_keyboard
        }
    });
}

async function sendSubRecords({chat_id,domain,page,keyword,size}) {
    let table = new Table({style:{head:[],border:[]}});
    const headers = ['Record','Type','Value','Status'];
    table.push(headers);

    size = size?size:20;
    keyword = keyword?keyword:'';
    page = page?page:1;

    let response;

    try {
        response = await getSubDomainRecords(domain,page,keyword,size);
    } catch(err) {
        return sendMsg({
            chat_id,
            text: err
        })
    }
    
    response.DomainRecords.Record.forEach(elem=>{
        let status = elem.Status=='ENABLE'?'√':'×';
        let row = [elem.RR,elem.Type,elem.Value,status];
        table.push(row);
    });

    let str = table.toString().replace(/─/g, '—');
    str += '\n\nThis is page '+response.PageNumber;
    let count = response.TotalCount;
    let pageLeft = count==0?count:Math.ceil(count/20)-response.PageNumber;
    str += '\nThere are still '+pageLeft+' pages left.';
    let inline_keyboard = [
        [
            {text: 'Prev',callback_data:`getSubDomainRecords ["${domain}",${page-1},"${keyword}",${size}]`},
            {text: 'Next',callback_data:`getSubDomainRecords ["${domain}",${page+1},"${keyword}",${size}]`}
        ]
    ];

    if (page==1) inline_keyboard[0].shift();
    if (pageLeft == 0) inline_keyboard[0].pop();

    if (debug) console.log(inline_keyboard);

    return sendMsg({
        chat_id,
        parse_mode: 'HTML',
        text: `\n<pre>${str}</pre>`,
        reply_markup: {
            inline_keyboard
        }
    });
}

async function sendDomainsList(chat_id) {
    let list = await getDomainList();
    const tab = new Table({style: {head:[],border:[]}});
    const headers = ['Index','Domain'];
    tab.push(headers);
    list.forEach((elem,index)=>{
        tab.push([index,elem]);
    });
    let str = tab.toString().replace(/─/g, '—');

    return sendMsg({
        chat_id,
        parse_mode: 'HTML',
        text: `\n<pre>${str}</pre>`
    });
}

function sendMsg(data) {
    const url = `https://api.telegram.org/bot${tgToken}/sendMessage`;
    return axins.post(url,data)
    .catch(err=>{
        if (debug) {
            console.log('Send message failed',url,data);
        }
        console.error(err);
    });
}