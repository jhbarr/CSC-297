#include <omp.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <math.h>
#include <string.h>
#include <assert.h>

// Basic operator functions
int iadd(int x, int y) { return x + y; }
int imult(int x, int y) { return x * y; }
int imax(int x, int y) { return x > y ? x : y; }

int gcd(int a, int b)
{
    if (a == 0)
    {
        return b;
    }
    else if (b == 0)
    {
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
int serial_reduce(int (*operator_func)(int x, int y), int vals[], int len, double *serial_time)
{
    int result = 0;

    double start = omp_get_wtime();

    for (int i = 0; i < len; i++)
    {
        result = operator_func(result, vals[i]);
    }
    double end = omp_get_wtime();
    double time_diff = end - start;

    *serial_time = time_diff;

    printf("Serial\n  Result: %d\n  Time: %lf\n", result, time_diff);

    // Return the resulting value
    return result;
}

// parallel_reduce() -> This function reduces a list of integer values into one using parallel loops
// INPUTS
//  - char operator -> The operator the should be used for the reduction
//  - int vals[] -> This is a lit of integer values that will be reduced using the operator function
//  - int len -> The length of the value array
int parallel_reduce(int vals[], int len, int n_threads, double *parallel_time)
{
    int i;
    int result = 0;

    double start = omp_get_wtime();

// #pragma omp declare reduction(                    \
//         gcd:int : omp_out = gcd(omp_out, omp_in)) \
//     initializer(omp_priv = 0)
#pragma omp parallel for reduction(+ : result)
    for (i = 0; i < len; i++)
    {
        // result = gcd(result, vals[i]);
        result += vals[i];
    }

    double end = omp_get_wtime();
    double time_diff = end - start;

    *parallel_time = time_diff;

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

    int vals[len];
    for (int i = 0; i < len; i++)
    {
        int random_val = (rand() % MAX_VAL) + 1;
        vals[i] = random_val;
    }

    // Open the CSV data file
    FILE *fp;
    fp = fopen("Data/reduce_data.csv", "w"); // Open for writing, overwriting if exists

    if (fp == NULL)
    {
        printf("Error opening file!\n");
        exit(1); // Exit with an error code
    }

    // Write header row
    fprintf(fp, "Thread Count,Trial,Serial Time,Parallel Time, Array Size\n");

    for (int n_threads = 1; n_threads < 9; n_threads++)
    {
        for (int trial = 1; trial < 4; trial++)
        {
            // Create a list of random integer variables of length len with max value MAX_VAL
            int serial_vals[len];
            int parallel_vals[len];

            memcpy(serial_vals, vals, len * sizeof(int));
            memcpy(parallel_vals, vals, len * sizeof(int));

            double parallel_time;
            double serial_time;

            // Calculate parallel result
            int parallel_result = parallel_reduce(parallel_vals, len, n_threads, &parallel_time);

            // Calculate the serial result
            int serial_result = serial_reduce(iadd, serial_vals, len, &serial_time);

            // Check that the two results are the same
            assert(parallel_result == serial_result);
            printf("\nAssertion 1 passed: The two results are the same\n");

            // Write the data to the csv file
            fprintf(fp, "%d,%d,%lf,%lf,%d\n", n_threads, trial, serial_time, parallel_time, len);
        }
    }

    fclose(fp); // Close the file
    printf("Data written to people.csv successfully\n");

    return 0;
}