var extract = require('extract-zip')
let fs = require('fs');
let path = process.cwd();
let source = path + '/'+process.argv[2];
let defaultDir = path + '/' + Math.random()
let jsonFileName = (process.argv[3]||'data') + '.json'


String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};


function extractPromise(source, defaultDir) {
    return new Promise((resolve, reject) => {
        extract(source, { dir: defaultDir }, function (err) {
            if (err) {
                reject()
            }
            else {
                resolve('done')
            }
        })
    })
}

function readDir(defaultDir) {
    return new Promise((resolve, reject) => {
        fs.readdir(defaultDir, (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result)
            }
        })
    })
}

function filter(data,params){
    return data.filter(x => x.indexOf(params !== -1))
}

function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf-8', (err, res) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(res)
            }
        })
    })
}

function parse(data) {
    return new Promise((resolve, reject) => {
        let result = [];
        let keys = [];
        data = data.replaceAll('"','');
        data.split('\r\n').forEach((element, index) => {
            if (!index) {
                keys = element.split('||');
            }
            else {
                let buffer = {};
                element.split('||').forEach((e, i) => {
                    if(e!==""){
                        buffer[keys[i]] = e;
                    }  
                })
                if(Object.keys(buffer).length){
                    result.push(buffer);
                }
                
            }
        })
        resolve(result);

    })
}

function writeFile(path,data){
    return new Promise((resolve,reject)=>{
        fs.writeFile(path,JSON.stringify(data),(err,res)=>{
            if(err){
                reject(err)
            }
            else {
                resolve(res)
            }
        })
    })
}

function middleware(data){
    let reformatDate = (dateString) => {
        let buffer = dateString.split('/');
        buffer[1] = buffer[1].length>1?buffer[1]:`0${buffer[1]}`
        buffer[0] = buffer[0].length>1?buffer[0]:`0${buffer[0]}`
        return [buffer[2],buffer[1],buffer[0]].join("-")
    } 
    return data.map(e=>{
        return {
            name:`${e.first_name} ${e.last_name}`,
            phone:e.phone.replace(/\(([^)]+)\)/,'').replace(' ',''),
            person: {
                first_name:{
                    type:"string",
                    value:e.first_name
                },
                last_name: {
                    type:"string",
                    value:e.last_name
                }
            },
            amount: Math.round(parseFloat(e.amount)*100)/100,
            date:reformatDate(e.date),
            costCenterNum:e.cc.replace('ACN','')
        };

    })
}

function deleteFile(path){
    return new Promise((resolve,reject)=>{
        fs.unlink(path,(err,res)=>{
            if(err){
                reject(err)
            }
            else {
                resolve(res)
            }
        })
    }) 
}

function deleteDir(path) {
    return new Promise((resolve,reject)=>{
        fs.rmdir(path,(err,res)=>{
            if(err){
                reject(err)
            }
            else {
                resolve(res)
            }
        })
    })
}


extractPromise(source, defaultDir)
    .then(data => {
        return readDir(defaultDir);
    }).then(files=>{
        return filter(files,'.csv')
    })
    .then(files => {
        return Promise.all(files.map(file => {
            return readFile(defaultDir + '/' + file)
        }))
    }).then(data => {
        return Promise.all(data.map(fileData=>{
            return parse(fileData);
        })) 
    }).then(objects=>{
        let array = [];
        objects.forEach(e=>{
            array = array.concat(e);
        })
        return middleware(array);
    }).then(data=>{
        return writeFile(defaultDir+'/../'+jsonFileName,data);
    }).then(result=>{
        console.log(result);
        return readDir(defaultDir);
    }).then(files=>{
        return Promise.all(files.map(fileName=>{
            return deleteFile(defaultDir+'/'+fileName);
        }))
    }).then(res=>{
        return deleteDir(defaultDir);
    }).then(res=>{
        console.log(
            `Check ${jsonFileName} file`
        )
    })
    .catch(err=>{
        console.log(err);
    })