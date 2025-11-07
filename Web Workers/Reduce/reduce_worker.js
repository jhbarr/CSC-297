// Worker function: sum with factorial
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Sums intergers up to n
function summation(n) {
    let result = 0;
    for (let i = 1; i <= n; i++) {
        result += i;
    }
    return result;
}

// Reduction function (addition and summation)
function reduce_func(x, y) {
    return x + summation(y);
}

// Worker reduction function: sum assigned chunks and return numeric partial sum
// TODO - why does this onmessage function work? Why can't we define it as function onmessage(event)
onmessage = function(event) {
    const data = event.data;
    const sharedBuffer = data.sharedBuffer;
    const indexChunks = data.indexChunks;

    const array = new Int32Array(sharedBuffer);
    let partialSum = 0;
    for (let j = 0; j < indexChunks.length; j++) {
        const indexStart = indexChunks[j][0];
        const indexEnd = indexChunks[j][1];
        for (let i = indexStart; i < indexEnd; i++) {
            const val = array[i];
            partialSum = reduce_func(partialSum, val);
        }
    }
    this.postMessage({ status: "done", result: partialSum});
}