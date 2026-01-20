import os

def scrape_ts_project(
    root_dir='.',
    output_file='full_code.txt'
):
    # Estensioni da includere (TypeScript / JavaScript / config utili)
    valid_extensions = (
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.json',
        '.yaml',
        '.yml'
    )

    # Cartelle da ignorare
    ignored_dirs = {
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
		'.vscode'
    }

    # File specifici da ignorare
    ignored_files = {
        '.gitignore',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml'
    }

    with open(output_file, 'w', encoding='utf-8') as f_out:
        for root, dirs, files in os.walk(root_dir):
            # Rimuoviamo le cartelle ignorate dalla walk
            dirs[:] = [d for d in dirs if d not in ignored_dirs]

            files.sort()

            for file in files:
                # Skip file ignorati
                if file in ignored_files:
                    continue

                # Skip source map
                if file.endswith('.map'):
                    continue

                # Check estensione valida
                if file.endswith(valid_extensions):
                    file_path = os.path.join(root, file)
                    display_path = file_path.replace(os.sep, '/')

                    try:
                        with open(file_path, 'r', encoding='utf-8') as f_in:
                            content = f_in.read()

                            # Header file
                            f_out.write(f"→ {display_path}\n")

                            # Linguaggio per il fenced block
                            lang = 'ts' if file.endswith(('.ts', '.tsx')) else 'js'
                            if file.endswith('.json'):
                                lang = 'json'
                            elif file.endswith(('.yaml', '.yml')):
                                lang = 'yaml'

                            f_out.write(f"```{lang}\n")
                            f_out.write(content)
                            f_out.write("\n```\n\n")
                            f_out.write("---\n")

                        print(f"Aggiunto: {display_path}")

                    except Exception as e:
                        print(f"Errore nella lettura di {display_path}: {e}")

if __name__ == "__main__":
    # Esegui dalla root del progetto TS / monorepo
    scrape_ts_project('.', 'full_code.txt')
    print("\nCompletato! Il file full_code.txt è pronto.")
