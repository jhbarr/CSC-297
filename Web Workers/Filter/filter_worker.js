/*
* predicate_func() -> This function takes the sum of all numbers up to the given input and then returns whether that number is even
* 
* INPUTS
*   - x (int) -> The number to be summed to
* 
* OUTPUTS
*   - bool -> Whether the resulting number is even or not
*/
function predicate_func(x)
{
    let sum = 0;
    for (let i = 0; i < x; i++) {
        sum += 1;
    }
    return sum % 2 == 0;
}

onmessage = function (event) {
    const data = event.data;
    const sharedBuffer = data.sharedBuffer;
    const sharedArray = new Int32Array(sharedBuffer);

    const filterBuffer = data.filterBuffer;
    const filterArray = new Int32Array(filterBuffer);

    const indexChunks = data.indexChunks;

    for (let j = 0; j < indexChunks.length; j++){
        const indexStart = indexChunks[j][0];
        const indexEnd = indexChunks[j][1];

        for (let i = indexStart; i < indexEnd; i++)
        {
            const val = sharedArray[i];
            filterArray[i] = predicate_func(val);
        }
    }
    
    // Don't forget to post the message
    this.postMessage({ status: 'done'});
};