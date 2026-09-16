.PHONY: notes cpp viz clean

notes:
	latexmk -xelatex -cd notes/main.tex

cpp:
	cmake -S cpp -B cpp/build
	cmake --build cpp/build
	mkdir -p data
	./cpp/build/heat_1d --out data/solution.json

viz:
	python3 -m http.server 8000

clean:
	latexmk -C -cd notes/main.tex
	rm -rf cpp/build
	rm -f data/solution.json data/solution.csv
