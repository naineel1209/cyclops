package sse

import (
	"context"
	"fmt"
	"k8s.io/apimachinery/pkg/watch"
	"time"
)

type ProxyChan struct {
	update bool
	input  <-chan watch.Event
	output chan any
}

func NewProxyChan(ctx context.Context, input <-chan watch.Event, interval time.Duration) ProxyChan {
	p := ProxyChan{
		input:  input,
		output: make(chan any),
	}

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		batcher := time.NewTicker(time.Millisecond * 500)
		defer batcher.Stop()

		for {
			select {
			case _, ok := <-p.input:
				if !ok {
					return
				}
				p.update = true
			case <-ticker.C:
				p.output <- true
			case <-batcher.C:
				if p.update {
					p.output <- true
				}
				p.update = false
			case <-ctx.Done():
				fmt.Println("ctx.Done jesam")
				return
			}
		}
	}()

	return p
}

func (p ProxyChan) Events() chan any {
	return p.output
}
