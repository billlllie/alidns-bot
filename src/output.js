const fs = require('fs');
const { resolve } = require('path');

(async function (){
    // main();
})();

function main() {
    let filename = 'DomainRecords.json';
    fs.readFile('test/'+filename,(err,data) => {
        if (err) throw err;

        return format(JSON.parse(data.toString()));
    });
    return;
}

function showDomains(response) {
    let json = JSON.parse(response);
    let domains = json.Domains.Domain;
    // console.log(domains);

    return new Promise(resolve => {
        let result = "\n";
        for (let i=0;i<domains.length;i++) {
            result += (i+1) +". "+domains[i].DomainName+'\n';
        }

        resolve(result);
    });
}

function showDomain(response) {
    let json = JSON.parse(response);
    // console.log(json);
}

function format(response) {
    if (response==undefined) return;

    let result = 'Record\tType\tLine(ISP)\tValue\tStatus\t\n';
    let count = response.TotalCount;
    let pageLeft = Math.ceil(count/20)-response.PageNumber;

    return new Promise(resolve=> {
        response.DomainRecords.Record.forEach(elem=> {
            result += elem.RR+'\t';
            result += elem.Type+'\t';
            result += elem.Line+'\t';
            result += elem.Value+'\t';
            result += elem.Status=='ENABLE'?'√':'×';
            result += '\n';
        });

        result += '\nThis is page '+response.PageNumber;
        result += '\nThere are still '+pageLeft+' pages left.\n';
        console.log(result);
        resolve(response);
    });
}

module.exports = {
    format,
    showDomains
}