// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Cli.Logging.Spectre.Loggers;
using Carcass.Cli.Logging.Spectre.Loggers.Abstracts;
using Carcass.Core;
using Carcass.FrontMatter.Core.Parsers.Abstracts;
using Carcass.LocalStorage.Models;
using Carcass.LocalStorage.Providers.Abstracts;
using Carcass.Mvc.Razor.Rendering.Renderers;
using Inka.Engine;
using Inka.Engine.Pipelines;
using Inka.Engine.Pipelines.Documents;
using Inka.Engine.Pipelines.Pipes;
using Inka.Engine.Pipelines.Pipes.Abstracts;
using Inka.Engine.VirtualObjects;
using Inka.Modules.Documents.Razor.Navs;

namespace Inka.Modules.Documents.Razor;

public interface IRazorPipe : IPipe
{
}

public sealed class RazorPipe : DocumentPipe, IRazorPipe
{
    private readonly IFrontMatterParser _razorFrontMatterParser;

    public RazorPipe(
        ISpectreCliLogger spectreCliLogger,
        ILocalStorageProvider localStorageProvider,
        PipeConfiguration configuration,
        string name,
        IFrontMatterParser razorFrontMatterParser
    ) : base(spectreCliLogger, localStorageProvider, configuration)
    {
        ArgumentVerifier.NotNull(name, nameof(name));
        ArgumentVerifier.NotNull(razorFrontMatterParser, nameof(razorFrontMatterParser));

        Name = name;
        _razorFrontMatterParser = razorFrontMatterParser;
    }

    public override string Name { get; }

    public override async Task ExecuteAsync(
        SpectreCliLoggerStatusContext spectreCliLoggerStatusContext,
        VirtualObjectTree virtualObjectTree,
        PipelineContext pipelineContext,
        CancellationToken cancellationToken = default
    )
    {
        await base.ExecuteAsync(spectreCliLoggerStatusContext, virtualObjectTree, pipelineContext, cancellationToken);

        spectreCliLoggerStatusContext.SetStatus($"{Name} pipe executing...");

        VirtualFile? layoutVirtualFile = virtualObjectTree
            .Flatten()
            .Where(vo => !vo.IsDirectory)
            .Cast<VirtualFile>()
            .SingleOrDefault(vo => vo.FullName == Predefined.File.Layout);

        foreach (Document document in Documents)
        {
            VirtualFile virtualFile = (VirtualFile) virtualObjectTree
                .Flatten()
                .Single(vo => vo.Id == document.VirtualObjectId);

            if (!virtualFile.IsCsHtmlFile() &&
                !virtualFile.IsHtmlFile() &&
                !virtualFile.IsMarkdownFile() ||
                layoutVirtualFile is not null && document.VirtualObjectId == layoutVirtualFile.Id ||
                virtualFile.FullName.StartsWith("_")
               ) continue;

            SpectreCliLogger.LogInformation("Execute Razor (front-matter) on document {0} starting...",
                virtualFile.FullPath
            );

            if (!virtualFile.IsMarkdownFile())
            {
                if (string.IsNullOrWhiteSpace(document.Content))
                    throw new Exception($"Document {virtualFile.FullPath} content is empty.");

                document.FrontMatter = _razorFrontMatterParser.Parse<DocumentFrontMatter>(document.Content);
                if (document.FrontMatter is null)
                    throw new Exception($"Document {virtualFile.FullPath} Razor front-matter could not be parsed.");
                document.FrontMatter.Validate();
            }

            SpectreCliLogger.LogInformation("Execute Razor (front-matter) on document {0} finished.",
                virtualFile.FullPath
            );
        }

        Navs.Navs navs = NavBuilder.BuildNavs(virtualObjectTree, Documents);
        foreach (Document document in Documents)
        {
            VirtualFile virtualFile = (VirtualFile) virtualObjectTree
                .Flatten()
                .Single(vo => vo.Id == document.VirtualObjectId);

            if (!virtualFile.IsCsHtmlFile() &&
                !virtualFile.IsHtmlFile() &&
                !virtualFile.IsMarkdownFile() ||
                layoutVirtualFile is not null && document.VirtualObjectId == layoutVirtualFile.Id ||
                virtualFile.FullName.StartsWith("_")
               ) continue;

            SpectreCliLogger.LogInformation("Execute Razor (render) on document {0} starting...",
                virtualFile.FullPath
            );

            string content = document.Content!;
            if (layoutVirtualFile is not null)
            {
                string layoutRelativePath = Path.Join("~", layoutVirtualFile.RelativePath);
                layoutRelativePath = layoutRelativePath.Replace("\\", "/");
                string razorLayoutString = $"@{{ Layout = \"{layoutRelativePath}\"; }}\n";
                content = razorLayoutString + content;
            }

            LocalFile temporaryLocalFile = await LocalStorageProvider.CreateTemporaryFileAsync(
                pipelineContext.LocalTemporaryDirectory!,
                content,
                ".cshtml",
                cancellationToken
            );

            document.Content = await RazorViewRendererFactory.New(
                pipelineContext.InputDirectory,
                Predefined.ApplicationName
            ).RenderAsync(
                temporaryLocalFile.RelativePath,
                new SiteViewModel(pipelineContext.SiteTitle, navs, document),
                cancellationToken
            );

            SpectreCliLogger.LogInformation("Execute Razor (render) on document {0} finished.",
                virtualFile.FullPath
            );
        }
    }
}