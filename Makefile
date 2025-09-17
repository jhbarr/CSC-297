CC = clang
CFLAGS = -Xpreprocessor -fopenmp -I/opt/homebrew/opt/libomp/include
LDFLAGS = -L/opt/homebrew/opt/libomp/lib -lomp

all: synchronization loops reduce

synchronization: Tutorials/synchronization.c
	$(CC) $(CFLAGS) Tutorials/synchronization.c -o bin/synchronization $(LDFLAGS)

loops: Tutorials/loops.c
	$(CC) $(CFLAGS) Tutorials/loops.c -o bin/loops $(LDFLAGS)

reduce: Projects/reduce.c
	$(CC) $(CFLAGS) Projects/reduce.c -o bin/reduce $(LDFLAGS)

map: Projects/map.c
	$(CC) $(CFLAGS) Projects/map.c -o bin/map $(LDFLAGS)

filter: Projects/filter.c
	${CC} ${CFLAGS} Projects/filter.c -o bin/filter ${LDFLAGS}