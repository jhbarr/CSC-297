#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

// Basic operator functions
int iadd(int x, int y) { return x + y; }
int imult(int x, int y) { return x * y; }
int imax(int x, int y) { return x > y ? x : y; }

// serial_reduce() -> This function reduces a list of variables into one using a given operation function
// INPUTS
//  - int (*operator_func)(int x, int y) -> This is a pointer to a function that takes in two integers and returns an int
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
int serial_reduce(int (*operator_func)(int x, int y), int vals[], int len)
{
    int result = vals[0];

    clock_t start = clock();
    for (int i = 1; i < len; i++)
    {
        result = operator_func(result, vals[i]);
    }
    clock_t end = clock();

    double time_diff = ((double)(end - start)) / CLOCKS_PER_SEC;
    printf("Serial\n  Result: %d\n  Time: %lf\n", result, time_diff);

    // Return the resulting value
    return result;
}

// parallel_reduce() -> This function reduces a list of integer values into one using parallel loops
// INPUTS
//  - char operator -> The operator the should be used for the reduction
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
int parallel_reduce(int vals[], int len)
{
    int i;
    int result = 0;

    clock_t start = clock();
#pragma omp parallel for reduction(+ : result)
    {
        for (i = 0; i < len; i++)
        {
            result += vals[i];
        }
    }
    clock_t end = clock();

    double time_diff = ((double)(end - start)) / CLOCKS_PER_SEC;
    printf("Parallel\n  Result: %d\n  Time: %lf\n", result, time_diff);
    // After the reduction, return the result
    return result;
}

int main(int argc, char *argv[])
{
    // Instantiate the basic variables for the reduction step
    // These will be taken from the command line
    int len = atoi(argv[1]);
    int MAX_VAL = atoi(argv[2]);

    // Create a list of random integer variables of length len with max value MAX_VAL
    int vals[len];
    for (int i = 0; i < len; i++)
    {
        vals[i] = (rand() % MAX_VAL) + 1;
    }

    // Calculate parallel result
    int parallel_result = parallel_reduce(vals, len);

    // Calculate the serial result
    int serial_result = serial_reduce(iadd, vals, len);

    return 0;
}