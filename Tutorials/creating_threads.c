#include <omp.h>
#include <stdio.h>

int main(int argc, char **argv)
{
// Exercise #1
// Execute a hello world program
#pragma omp parallel num_threads(4)
    {
        int ID = omp_get_thread_num();

        printf("Hello(%d)", ID);
        printf("World(%d)", ID)
    }
    return 0;
}