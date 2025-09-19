#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include <string.h>

// Basic operator functions
int iadd(int x, int y) { return x + y; }
int imult(int x, int y) { return x * y; }
int imax(int x, int y) { return x > y ? x : y; }

int gcd(int a, int b)
{
    if (a == 0) {
        return b;
    } else if (b == 0) {
        return a;
    }

    int result = ((a < b) ? a : b); // result = min(a, b)
    while (result > 0)
    {
        if (a % result == 0 && b % result == 0)
        {
            break;
        }
        result--;
    } // After exiting loop we have found gcd
    return result;
}

// serial_reduce() -> This function reduces a list of variables into one using a given operation function
// INPUTS
//  - int (*operator_func)(int x, int y) -> This is a pointer to a function that takes in two integers and returns an int
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
int serial_reduce(int (*operator_func)(int x, int y), int vals[], int len)
{
    int result = 0;

    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);

    for (int i = 0; i < len; i++)
    {
        result = operator_func(result, vals[i]);
    }
    clock_gettime(CLOCK_MONOTONIC, &end);

    double time_diff = (end.tv_sec - start.tv_sec) +
                       (end.tv_nsec - start.tv_nsec) / 1e9;

    printf("Serial\n  Result: %d\n  Time: %lf\n", result, time_diff);

    // Return the resulting value
    return result;
}

// parallel_reduce() -> This function reduces a list of integer values into one using parallel loops
// INPUTS
//  - char operator -> The operator the should be used for the reduction
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
int parallel_reduce(int vals[], int len, int n_threads)
{
    int i;
    int result = 0;

    double start = omp_get_wtime();

#pragma omp declare reduction(                    \
        gcd:int : omp_out = gcd(omp_out, omp_in)) \
    initializer(omp_priv = 0)
#pragma omp parallel for reduction(gcd : result)
    for (i = 0; i < len; i++)
    {
        result = gcd(result, vals[i]);
    }

    double end = omp_get_wtime();

    double time_diff = end - start;

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
    int num_threads = atoi(argv[3]);

    // Create a list of random integer variables of length len with max value MAX_VAL
    int vals1[len];
    int vals2[len];
    for (int i = 0; i < len; i++)
    {
        vals1[i] = (rand() % MAX_VAL) + 20;
        printf("%d \n", vals1[i]);
    }

    memcpy(vals2, vals1, len * sizeof(int));

    // Calculate parallel result
    int parallel_result = parallel_reduce(vals1, len, num_threads);

    // Calculate the serial result
    int serial_result = serial_reduce(gcd, vals2, len);

    // int test_gcd = gcd(0, 4);
    // printf("%d \n", test_gcd);

    return 0;
}