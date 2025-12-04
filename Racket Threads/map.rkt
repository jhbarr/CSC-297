#lang racket
(require racket/list racket/future racket/random racket/file)

(define list-length 1000000)


(define (map-func x)
  ; expensive-but-bounded function:
  (let* ([mod 1000003]    ; keep values from growing too large
         [iters 1000])    ; increase for more work per element
    (let loop ([i 0] [v (modulo x mod)])
      (if (>= i iters)
          v
          (loop (add1 i) (modulo (+ (* v v) 97) mod))))))

; Create random list of numbers
(define l1
    (for/list ([i (in-range list-length)])
        (random 1000000)))                ; values in [0,1000000)

; serial map 
(define (serial-map f)
  (map f l1))

(define (split-into-n lst n)
  (let* ([len (length lst)]
         [chunk (quotient (+ len n -1) n)]) ; ceiling division for chunk size
    (for/list ([i (in-range n)])
      (let* ([start (* i chunk)]
             [end (min (+ start chunk) len)])
        (take (drop lst start) (- end start))))))

; parallel map
(define (parallel-map f num-threads)
  (let* ([parts (split-into-n l1 num-threads)]
         [futures (for/list ([part parts])
                    (future (lambda () (map f part))))]
         [results (for/list ([f futures]) (touch f))])
    (apply append results)))

; run with time
;(print "Parallel: ")
;(define parallel-result (time (parallel-map map-func 4)))
;(print "Serial: ");
;(define serial-result (time (serial-map map-func)))

;(printf "equal? ~a\n" (equal? serial-result parallel-result))


; Benchmarking: run trials and collect times
(define (benchmark-trial f num-threads)
  (let* ([serial-start (current-inexact-milliseconds)]
         [serial-result (serial-map f)]
         [serial-end (current-inexact-milliseconds)]
         [serial-time (/ (- serial-end serial-start) 1000.0)]
         [parallel-start (current-inexact-milliseconds)]
         [parallel-result (parallel-map f num-threads)]
         [parallel-end (current-inexact-milliseconds)]
         [parallel-time (/ (- parallel-end parallel-start) 1000.0)])
    (if (equal? serial-result parallel-result)
        (list num-threads serial-time parallel-time list-length)
        (begin
          (printf "ERROR: Results don't match for num-threads=~a\n" num-threads)
          (exit 1)))))

(define (run-benchmarks)
  (let ([results
         (for*/list ([num-threads (in-range 1 9)]
                     [trial (in-range 1 6)])
           (let ([row (benchmark-trial map-func num-threads)])
             (list (car row) trial (cadr row) (caddr row) list-length)))])
    results))

; Write to CSV
(define (write-csv filename results)
  ;; remove existing file so call-with-output-file creates a fresh file
  (when (file-exists? filename)
    (delete-file filename))
  (call-with-output-file filename
    (lambda (out)
      (fprintf out "Thread Count,Trial,Serial Time,Parallel Time,Array Size\n")
      (for ([row results])
        ;; row is (num-threads trial serial-time parallel-time array-size)
        (fprintf out "~a,~a,~a,~a,~a\n"
                 (car row) (cadr row) (caddr row) (cadddr row) (car (cddddr row)))))))

; Run benchmarks and save
(printf "Running benchmarks...\n")
(define benchmark-results (run-benchmarks))
(write-csv "racket_map_data.csv" benchmark-results)
(printf "Results saved to benchmark_results.csv\n")

