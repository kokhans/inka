# Inka [![GitHub](https://img.shields.io/github/license/kokhans/inka?style=flat-square)](LICENSE)

`Inka` is a cross-platform static site generator built with `.NET 6`, based on rendering `Markdown` and `Razor` markups to `HTML` document.

## Status

### Pre-Alpha

The software is still under active development and not feature complete or ready for consumption by anyone other than software developers. There may be milestones during the pre-alpha which deliver specific sets of functionality, and nightly builds for other developers or users who are comfortable living on the absolute bleeding edge.

## Features

- Engine configuration via file
- Flexible routing
- `Markdown` and `Razor` processors
- `YAML` front matter parser
- `Razor` layouting and data context rendering
- `Less` stylesheets preprocessor
- Static content copier
- `HTML` document minifier
- Rich CLI output
- Sitemap generator

## Getting Started

**Prerequisites**
- [.NET 6 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/6.0)
- [Visual Studio 2022](https://visualstudio.microsoft.com/vs/)

**Step 1: Create .NET Core console application**

```powershell
dotnet new console
```

**Step 2: Install Inka.Engine**

```powershell
dotnet add package Inka.Engine
```

**Step 3: Create Bootstrapper**

```csharp
using Inka.Engine.Bootstrapping;

await Bootstrapper
    .New()
    .Configure(_ => { })
    .RunAsync()
```

**Step 4: Add modules**

**Step 5: Configure pipeline**

**Step 6: Run application**

```powershell
dotnet run
```

## Modules

`Inka` provides a set of modules that can be used to extend and customize the static site generation pipeline.

### Documents

#### Markdown

`Markdown` document module provides `Markdown` markup to `HTML` document rendering.

#### Razor

`Razor` document module provides `Razor` markup to `HTML` document rendering.

#### Less

`Less` document module provides `.less` to `.css` stylesheets compilation.

#### Static

`Static` document module provides copying of static content to the output directory.

#### MinifyHtml

`MinifyHtml` document module provides `HTML` document minification.

### Operations

#### Output

`Output` operation module provides copying of document content from the pipeline context to the output directory.

#### Sitemap

`Sitemap` operation module provides automatic `sitemap.xml` generation.

## Templates

### Blog

`Blog` template provides content structure and pipeline configuration to build a static blog site.

## License

This project is licensed under the [MIT license](LICENSE).