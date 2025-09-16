#include <omp.h>
#include <stdio.h>

int main(int argc, char **argv)
{
    printf("Exercise 1: PI\n");
    static long num_steps = 100000;
    double step = 1.0 / (double)num_steps;

    int i;
    double x, pi, sum = 0.0;
#pragma omp parallel for reduction(+ : sum)
    {
        for (i = 0; i < num_steps; i++)
        {
            x = (i + 0.5) * step;
            sum = sum + 4.0 / (1.0 + x * x);
        }
    }
    pi = step * sum;

    printf("pi = %lf\n", pi);
    return 0;
}