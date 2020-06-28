const AliyunDNS = require('@mhycy/aliyun-dns');
const db = require('better-sqlite3')(':memory:');

const { accessKeyId, accessKeySecret, debug } = require('./test');

const client = AliyunDNS.createClient(accessKeyId, accessKeySecret);

module.exports = {
    getDomainList,
    getSubDomainRecords,
    lookupRRId,
    addDomainRecord,
    deleteDomainRecord,
    db,
    setupDB
}

async function setupDB() {
    db.exec("create table if not exists CachedRecord ('Record' varchar PRIMARYKEY,'Domain' varchar PRIMARYKEY,'RRId' varchar)");
}

async function getDomainList() {
    let response = await client.DescribeDomains()
        .catch(err => {
            if (err) return Promise.reject(err.data.Message);
        });
    let domains = [];

    response.Domains.Domain
        .forEach(val => {
            domains.push(val.DomainName);
        });

    return domains;
}

async function getSubDomainRecords(domain, page, keyword = '', size = 20) {
    let response = client.DescribeDomainRecords({
        DomainName: domain,
        PageNumber: page > 0 ? page : 1,
        RRKeyWord: keyword?keyword:'',
        PageSize: size?size:20
    }).catch(err => {
        if (err) throw Error(err);
    });

    return response;
}

async function lookupRRId(domain, keyword) {
    let record = await getSubDomainRecords(domain, 1, keyword, 500);

    let RRid = [];
    record.DomainRecords.Record.forEach(elem => {
        RRid.push(elem.RecordId);
    });
    let row = db.prepare('select RRId from CachedRecord where Record=? and Domain=?').get(keyword, domain);

    if (row) {
        if (debug) console.log('Record exists. Updating.');
        db.prepare('update CachedRecord set RRId = ? where Record=? and Domain=?')
            .run(JSON.stringify(RRid), keyword, domain);
        return record;
    } else {
        if (debug) console.log('Record will be inserted.');
        db.prepare('insert into CachedRecord (Record,Domain,RRId) VALUES (?,?,?)')
            .run(keyword, domain, JSON.stringify(RRid));
        return record;
    }
}

async function addDomainRecord(domain, rr, type, value) {
    await client.AddDomainRecord({
        DomainName: domain,
        RR: rr,
        Type: type,
        Value: value
    }).catch(err => {
        if (err) {
            if (err.data.Code != 'DomainRecordDuplicate') {
                throw Error(err.data.Message);
            } else if (debug) {
                console.log(err.data.Message);
            }
        }
    });

    if (debug) console.log('Add operation succedded.');
    return true;
}

async function deleteDomainRecord(domain, keyword, index) {
    if (index == undefined) throw new Error('Need to specify the index');
    let stmt = db.prepare("select RRId from CachedRecord where Domain=? and Record=?");
    let row = stmt.get(domain, keyword);
    let RRid = [];

    if (row) {
        RRid = JSON.parse(row.RRId);
    } else {
        throw new Error('No such record');
    }

    await client.DeleteDomainRecord({
        RecordId: RRid[index],
    }).catch(err => {
        if (err.data.Code != 'DomainRecordNotBelongToUser') {
            return Promise.reject(err.data.Message);
        } else if (debug) {
            console.log(err.data.Message);
        }
    });

    if (debug) console.log('Delete succeeded.');
    return true;
}
