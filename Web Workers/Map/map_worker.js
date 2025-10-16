onmessage = function (event) {
    const data = event.data;
    const sharedBuffer = data.sharedBuffer;
    const sharedArray = new Int32Array(sharedBuffer);
    const indexChunks = data.indexChunks;

    for (let j = 0; j < indexChunks.length; j++){
        const indexStart = indexChunks[j][0];
        const indexEnd = indexChunks[j][1];

        for (let i = indexStart; i < indexEnd; i++)
        {
            const val = Atomics.load(sharedArray, i);
            Atomics.exchange(sharedArray, i, val * 2);
        }
    }
    
    // Don't forget to post the message
    this.postMessage({ status: 'done'});
};